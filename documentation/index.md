**Projektdokumentation: Agentic Contextual RAG mit Mastra & Gemini**

Version: 1.0  
Datum: 29\. April 2025  
**Inhaltsverzeichnis:**

1. Einleitung & Projektziele  
2. Systemarchitektur  
3. Technologie-Stack  
4. Kernkomponenten  
   * Mastra Agents & Workflows  
   * RAG-Pipeline-Komponenten  
   * Datenbank (PostgreSQL)  
   * Tools  
5. Implementierungsdetails  
   * Daten-Ingestion & Kontextualisierung (Offline)  
   * Anfrageverarbeitung & Retrieval (Laufzeit)  
   * Agentenlogik & Workflow-Orchestrierung  
   * Fehlerbehandlung  
6. API Endpunkte & Funktionen  
7. Evaluierung & Observability  
8. Deployment

**1\. Einleitung & Projektziele**

Dieses Dokument beschreibt die Planung und Architektur eines fortschrittlichen Retrieval-Augmented Generation (RAG)-Systems, implementiert in TypeScript.

* **Ziel:** Entwicklung eines hochperformanten, flexiblen und genauen RAG-Systems durch die Kombination von agentenbasierten Workflows (Agentic RAG) mit der Contextual Retrieval-Technik.  
* **Kernproblem:** Traditionelle RAG-Systeme leiden oft unter mangelndem Kontextverständnis beim Retrieval, was zu irrelevanten Ergebnissen führt. Agentic RAG bietet dynamische Anpassungsfähigkeit, die jedoch von präzisem Retrieval profitiert. Dieses Projekt verbindet beide Ansätze, um die Stärken beider Welten zu nutzen.  
* **Hauptvorteile:**  
  * Signifikant verbesserte Retrieval-Genauigkeit und Reduzierung fehlgeschlagener Suchen durch kontextualisierte Daten-Chunks.  
  * Erhöhte Flexibilität bei der Bearbeitung komplexer, mehrstufiger Anfragen durch agentenbasierte Steuerung und dynamische Query Reformulation.  
  * Nutzung eines modernen, TypeScript-basierten Technologie-Stacks (Mastra, Vercel AI SDK, PostgreSQL) für eine robuste und wartbare Implementierung.  
  * Kosteneffizienz bei der Datenvorverarbeitung durch potenzielles Prompt Caching.

**2\. Systemarchitektur**

Das System folgt einem agentengesteuerten, kontext-angereicherten RAG-Ansatz, der sowohl einen Offline-Datenverarbeitungsprozess als auch einen Laufzeit-Anfrageprozess umfasst.

**2.1 Offline-Prozess: Daten-Ingestion & Kontextualisierung**

Dieser Prozess bereitet die Wissensbasis für das effiziente Retrieval vor und wird typischerweise einmalig oder periodisch ausgeführt.

1. **Dokumenten-Ladung:** Quelldokumente werden geladen.  
2. **Chunking:** Dokumente werden in kleinere Text-Chunks aufgeteilt (konfigurierbare Strategie).  
3. **Kontext-Generierung:** Für jeden Chunk wird mittels Google Gemini (via Vercel AI SDK) eine kurze, kontextspezifische Zusammenfassung oder Erklärung generiert. Hierbei wird versucht, **Prompt Caching** zu nutzen, um das vollständige Dokument effizient im Speicher zu halten und Kosten zu minimieren.  
4. **Kontextualisierte Daten:** Der generierte Kontext wird dem Original-Chunk vorangestellt.  
5. **BM25-Tokenisierung:** Der *kontextualisierte* Chunk wird mithilfe der pg\_tokenizer.rs-Erweiterung in PostgreSQL tokenisiert und als bm25vector gespeichert.  
6. **Embedding:** Für den *kontextualisierten* Chunk wird ein Vektor-Embedding mit Google Gemini (via Vercel AI SDK embed/embedMany) erstellt und als vector (PGVector) in PostgreSQL gespeichert.  
7. **Speicherung:** Alle relevanten Daten (Original-Chunk, Kontext, kontextualisierter Text, bm25vector, embedding\_vector, Metadaten) werden in der PostgreSQL-Datenbank abgelegt.

**2.2 Laufzeit-Prozess: Anfrageverarbeitung & Antwortgenerierung**

Dieser Prozess wird bei jeder Benutzeranfrage durchlaufen.

1. **Anfrage-Eingang:** Eine Anfrage (z.B. über POST /api/chat) initiiert den mainRagWorkflow in Mastra.  
2. **Workflow-Orchestrierung (Mastra):**  
   * Ein coordinatorAgent analysiert die Anfrage.  
   * **Query Reformulation (Optional):** Der coordinatorAgent kann entscheiden, die Anfrage mithilfe von Gemini (via Vercel AI SDK) umzuformulieren, um die Retrieval-Qualität zu verbessern.  
   * Der coordinatorAgent delegiert die Retrieval-Aufgabe mit der (ggf. reformulierten) Anfrage an den retrievalAgent.  
3. **Duales Kontext-Retrieval (Mastra Tool / Agent):**  
   * Der retrievalAgent (oder direkt der Workflow über Tools) führt zwei parallele Suchen durch:  
     * **BM25-Suche:** Das postgresBm25Tool tokenisiert die (reformulierte) Anfrage und führt eine VectorChord-BM25-Suche (\<&\> Operator) auf den *kontextualisierten* bm25vector-Daten in PostgreSQL aus.  
     * **Vektorsuche:** Das postgresVectorTool (oder Mastra PGVector-Integration) führt eine semantische Ähnlichkeitssuche auf den *kontextualisierten* Vektor-Embeddings in PostgreSQL (PGVector) durch.  
4. **Ergebniskombination & Re-Ranking (Mastra):**  
   * Die Ergebnisse (Chunks) beider Suchen werden gesammelt.  
   * Mastra's Re-Ranking-Funktionalität (oder ein externes Tool) bewertet die kombinierten Chunks basierend auf ihrer Relevanz zur (re-)formulierten Anfrage neu und wählt die Top-K Chunks aus.  
5. **Antwortgenerierung (Mastra Agent):**  
   * Der generatorAgent erhält die Top-K Chunks (mit ihrem Kontext) und die ursprüngliche Benutzeranfrage.  
   * Er interagiert mit Google Gemini (über das Vercel AI SDK via Mastra), um unter Berücksichtigung des bereitgestellten Kontexts die finale, kohärente Antwort zu generieren.  
6. **Antwort-Ausgabe:** Die generierte Antwort wird (typischerweise als Stream) an den Aufrufer zurückgegeben.

**3\. Technologie-Stack**

* **Sprache:** TypeScript  
* **Core Framework:** Mastra (TypeScript) \- Für Agenten, Workflows, RAG-Komponenten, Tools, Evals, Observability.  
* **AI SDK:** Vercel AI SDK (@ai-sdk/core, @ai-sdk/google) (TypeScript) \- Für LLM-Interaktion (Gemini), Embedding (Gemini), Streaming.  
* **LLM & Embedding:** Google Gemini (Modelle wie gemini-1.5-pro-latest, gemini-1.5-flash-latest, text-embedding-004).  
* **Datenbank:** PostgreSQL (v17+ empfohlen)  
* **DB-Erweiterungen:**  
  * VectorChord-BM25 (BM25-Ranking)  
  * pg\_tokenizer.rs (BM25-Tokenisierung, z.B. mit BERT oder Custom Model)  
  * pgvector (Vektorsuche)  
* **DB-Client (TypeScript):** pg oder kompatible Bibliothek.  
* **Reranker (Optional):** Mastra built-in oder externe API (z.B. Cohere).  
* **Deployment:** Node.js-Umgebung (Vercel, Cloud Run, etc.), PostgreSQL-Hosting mit Erweiterungs-Support (Docker, Supabase, Neon, etc.).

**4\. Kernkomponenten**

* **Mastra Agents (/src/agents):**  
  * coordinatorAgent.ts: Nimmt Anfragen entgegen, analysiert, plant (inkl. Entscheidung über Query Reformulation), delegiert an Retrieval und Generierung.  
  * retrievalAgent.ts: Führt die Retrieval-Tools (postgresBm25Tool, postgresVectorTool) aus und gibt die Roh-Ergebnisse zurück.  
  * generatorAgent.ts: Empfängt kontextuelle Chunks und Anfrage, interagiert mit Gemini zur Synthese der finalen Antwort.  
* **Mastra Workflows (/src/workflows):**  
  * mainRagWorkflow.ts: Orchestriert den Laufzeit-Prozess: Koordinator \-\> (Reformulierung) \-\> Retrieval \-\> Re-Ranking \-\> Generator \-\> Antwort. Nutzt Mastra-Features wie Variablenübergabe, Fehlerbehandlung, ggf. Parallelisierung der Retrieval-Schritte.  
  * contextualizeData.ts: Workflow (oder Skript in /src/scripts) für den Offline-Prozess: Chunking \-\> Kontext-Generierung (mit Caching-Versuch) \-\> BM25-Tokenisierung \-\> Embedding \-\> DB-Speicherung.  
* **Mastra Tools (/src/tools):**  
  * postgresBm25Tool.ts: Kapselt die VectorChord-BM25-Abfrage. Nimmt (reformulierte) Query entgegen, nutzt /db/bm25 für Tokenisierung und SQL-Ausführung.  
  * postgresVectorTool.ts: Kapselt die PGVector-Suche. Nimmt (reformulierte) Query entgegen, erstellt Embedding (via Vercel AI SDK) und führt Ähnlichkeitssuche über /db/vector aus (oder nutzt Mastra-Integration).  
  * queryReformulatorTool.ts (Optional): Ruft Gemini (via Vercel AI SDK) auf, um eine gegebene Query zu verbessern.  
  * rerankerTool.ts (Optional): Ruft eine externe Reranking-API auf.  
* **RAG-Logik (/src/rag):**  
  * chunking.ts: Konfigurierbare Funktion zum Aufteilen von Texten.  
  * contextualizer.ts: Funktion, die Gemini über das Vercel AI SDK aufruft, um den Kontext für einen Chunk zu generieren (beachtet Caching-Möglichkeit).  
  * tokenizer.config.ts: Konfigurationsdatei für pg\_tokenizer.rs.  
* **Datenbank (/src/db):**  
  * schema.ts: Definiert die PostgreSQL-Tabelle (z.B. contextual\_chunks) mit Spalten für id, source\_document\_id, chunk\_index, original\_text, context\_annotation, contextualized\_text, bm25\_vector (bm25vector), embedding\_vector (vector).  
  * client.ts: Initialisiert und exportiert den PostgreSQL-Client.  
  * bm25.ts: Enthält Funktionen wie tokenizeForBM25(text: string): Promise\<string\> (ruft DB-Funktion auf) und searchBM25(queryVector: string, limit: number): Promise\<ChunkResult\[\]\>.  
  * vector.ts: Enthält Funktionen wie searchVector(queryEmbedding: number\[\], limit: number): Promise\<ChunkResult\[\]\>.  
* **Bibliothek/Konfiguration (/src/lib):**  
  * mastra.ts: Initialisiert Mastra, registriert Agents, Workflows, Tools und Integrationen (Vercel AI SDK).  
  * vercelAI.ts: Konfiguriert den Vercel AI SDK Google Provider mit API-Key und spezifischen Gemini-Modell-IDs für Generierung und Embedding. Enthält Logik zur Aktivierung von Prompt Caching, falls unterstützt.  
  * types.ts: Definiert zentrale Schnittstellen (z.B. ChunkResult, ApiRequest, ApiResponse).

**5\. Implementierungsdetails**

* **Daten-Ingestion & Kontextualisierung:**  
  * Der /scripts/ingest.ts (oder contextualizeData-Workflow) nutzt die Komponenten aus /rag und /db.  
  * Effizienz ist hier wichtig: Batch-Verarbeitung von Chunks für Embedding und DB-Operationen.  
  * Prüfung der Vercel AI SDK-Fähigkeiten bezüglich **Prompt Caching** für Gemini ist kritisch für die Kosteneffizienz der Kontextgenerierung. Wenn nicht direkt unterstützt, muss eine alternative Caching-Strategie oder Batching implementiert werden.  
* **Anfrageverarbeitung & Retrieval:**  
  * Der mainRagWorkflow steuert den Fluss.  
  * Die BM25- und Vektorsuchen erfolgen auf den *kontextualisierten* Daten.  
  * Die Kombination der Ergebnisse (z.B. Reciprocal Rank Fusion) vor dem Re-Ranking muss implementiert werden. Mastra könnte hierfür Mechanismen bieten oder es erfolgt im Workflow/Agent.  
* **Agentenlogik:**  
  * Der coordinatorAgent muss die Logik zur Entscheidung über Query Reformulation enthalten (z.B. basierend auf Anfragekomplexität oder ersten Retrieval-Ergebnissen).  
  * Der generatorAgent muss den Prompt für Gemini so konstruieren, dass die kontextuellen Chunks effektiv genutzt werden.  
* **Fehlerbehandlung:** Robuste Fehlerbehandlung in allen Workflow-Schritten und Tool-Ausführungen, insbesondere bei externen API-Aufrufen (Gemini, Reranker) und Datenbankoperationen. Mastra bietet Mechanismen für Step Retries.

**6\. API Endpunkte & Funktionen**

* **Endpunkt:** POST /api/chat  
* **Zweck:** Hauptschnittstelle für Benutzeranfragen an das RAG-System.  
* **Funktionsablauf:**  
  1. **Anfrage empfangen:** Nimmt eine HTTP POST-Anfrage mit einer JSON-Payload entgegen. Erwartete Payload: { "query": string, "threadId"?: string, "chatHistory"?: Array\<{ role: 'user' | 'assistant', content: string }\> }.  
  2. **Validierung:** Überprüft die Eingabeparameter.  
  3. **Workflow starten:** Ruft mastra.workflow('mainRagWorkflow').createRun() und anschließend start() oder execute() auf und übergibt die query und ggf. chatHistory/threadId als initiale Workflow-Variablen.  
  4. **Streaming der Antwort:**  
     * Der Workflow gibt idealerweise einen Stream zurück (z.B. über Mastras Fähigkeiten oder direkt vom Vercel AI SDK streamText-Aufruf im generatorAgent).  
     * Die API-Route nutzt eine geeignete Methode (z.B. Vercel AI SDK's toDataStreamResponse oder eine äquivalente Mastra-Funktion), um die Text-Chunks und potenziellen Metadaten (Quellen, Status) als Server-Sent Events (SSE) an den Client zu streamen.  
  5. **Fehlerbehandlung:** Fängt Fehler vom Mastra-Workflow ab und gibt eine entsprechende HTTP-Fehlerantwort zurück (z.B. 500 Internal Server Error mit einer Fehler-ID).  
* **Authentifizierung:** Implementierung eines geeigneten Mechanismus (z.B. JWT, API-Keys) zum Schutz des Endpunkts.

**7\. Evaluierung & Observability**

* **Evaluierung:** Regelmäßige Durchführung von Evaluierungen mit Mastra Evals gegen vordefinierte Testfälle, um die Qualität des Retrievals (Recall@K, MRR auf kontextualisierten Daten) und der generierten Antworten (Faithfulness, Relevanz) zu messen.  
* **Observability:** Konfiguration von Mastra für OpenTelemetry, um Traces und Logs zu sammeln. Integration mit einer Observability-Plattform (z.B. SigNoz, Langfuse, Dash0), um Latenzen, Token-Verbrauch, Fehler und den Workflow-Ablauf zu überwachen.

**8\. Deployment**

* **Anwendung:** Deployment der TypeScript/Mastra-Anwendung als Node.js-Service (z.B. auf Cloud Run, Vercel Serverless Functions). Sicherstellung, dass die Umgebungsvariablen (API-Keys, DB-Credentials) sicher konfiguriert sind.  
* **Datenbank:** Bereitstellung einer PostgreSQL-Instanz. Installation und Konfiguration der Erweiterungen VectorChord-BM25, pg\_tokenizer.rs und pgvector. Einrichtung der Indizes (bm25 Index für VectorChord, GIN/GiST/HNSW für pgvector). Konfiguration des search\_path.  
* **Ingestion-Pipeline:** Sicherstellung, dass der Daten-Ingestion-Prozess (/scripts/ingest.ts) zuverlässig ausgeführt werden kann, um die Datenbank zu befüllen und aktuell zu halten.

Diese Dokumentation bildet die Grundlage für die Entwicklung. Sie sollte während des Implementierungsprozesses kontinuierlich aktualisiert werden.