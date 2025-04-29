/your-project-root  
├── .env.example           \# Vorlage für Umgebungsvariablen (API-Keys, DB-Zugang)  
├── .gitignore  
├── docker-compose.yml     \# Für lokale PostgreSQL-Instanz mit Erweiterungen  
├── mastra.config.ts       \# Mastra Konfigurationsdatei  
├── package.json  
├── setup\_db.sql           \# SQL-Skript zur Initialisierung der DB (Erweiterungen, Tabellen)  
├── tsconfig.json  
│  
└── src/                   \# Haupt-Quellcode-Verzeichnis  
    ├── agents/            \# Mastra Agent-Definitionen  
    │   ├── coordinatorAgent.ts  
    │   ├── retrievalAgent.ts  
    │   └── generatorAgent.ts  
    │  
    ├── app/               \# Anwendungs-spezifische Logik (z.B. API-Routen)  
    │   └── api/  
    │       └── chat/  
    │           └── route.ts \# Haupt-API-Endpunkt für RAG-Anfragen  
    │  
    ├── db/                \# Datenbank-Interaktion und Schema  
    │   ├── schema.ts      \# PostgreSQL Tabellen-Definitionen (z.B. contextual\_chunks)  
    │   ├── client.ts      \# PostgreSQL Client-Konfiguration und Instanz  
    │   ├── bm25.ts        \# Hilfsfunktionen für VectorChord BM25  
    │   └── vector.ts      \# Hilfsfunktionen für PGVector  
    │  
    ├── lib/               \# Kernbibliotheken, Konfigurationen, globale Typen  
    │   ├── mastra.ts      \# Mastra Initialisierung und Konfiguration  
    │   ├── vercelAI.ts    \# Vercel AI SDK Konfiguration (Google Gemini)  
    │   └── types.ts       \# Globale TypeScript Typdefinitionen  
    │  
    ├── rag/               \# RAG-spezifische Logik  
    │   ├── chunking.ts    \# Chunking-Strategie Implementierung  
    │   ├── contextualizer.ts\# Logik zur Generierung von Kontext (nutzt Vercel AI SDK)  
    │   └── tokenizer.config.ts \# Konfiguration für pg\_tokenizer.rs  
    │  
    ├── scripts/           \# Hilfsskripte (z.B. für Daten-Ingestion)  
    │   └── ingest.ts      \# Skript zum Laden, Verarbeiten und Speichern von Daten  
    │  
    ├── tools/             \# Mastra Tool-Definitionen  
    │   ├── postgresBm25Tool.ts  
    │   ├── postgresVectorTool.ts  
    │   ├── queryReformulatorTool.ts \# (Optional)  
    │   ├── rerankerTool.ts          \# (Optional)  
    │   └── webSearchTool.ts         \# (Optional)  
    │  
    └── workflows/         \# Mastra Workflow-Definitionen  
        ├── mainRagWorkflow.ts   \# Haupt-Workflow für Laufzeit-Anfragen  
        └── contextualizeData.ts \# Workflow für Offline-Datenverarbeitung

**Erläuterungen:**

* **/src/agents**: Enthält die Logik für die verschiedenen autonomen Agenten, die im System agieren (Koordination, Retrieval, Generierung).  
* **/src/app**: Beinhaltet die Schnittstellen zur Außenwelt, typischerweise API-Routen, die Anfragen entgegennehmen und die Mastra-Workflows starten.  
* **/src/db**: Kapselt alle Interaktionen mit der PostgreSQL-Datenbank, inklusive Schema-Definitionen und spezifischer Logik für die Erweiterungen (VectorChord, PGVector).  
* **/src/lib**: Dient als zentrale Stelle für die Initialisierung und Konfiguration der Haupt-Frameworks (Mastra, Vercel AI SDK) und für globale Typdefinitionen.  
* **/src/rag**: Bündelt die spezifische Logik für die Retrieval-Augmented Generation, insbesondere die Teile, die für den Contextual Retrieval-Ansatz relevant sind (Chunking, Kontextualisierung).  
* **/src/scripts**: Enthält Skripte für unterstützende Prozesse, vor allem für die initiale Datenverarbeitung und \-speicherung.  
* **/src/tools**: Definiert die Werkzeuge, die von den Mastra-Agenten und \-Workflows verwendet werden können, um spezifische Aufgaben auszuführen (DB-Abfragen, externe API-Aufrufe etc.).  
* **/src/workflows**: Definiert die Abläufe und die Orchestrierung der verschiedenen Schritte und Agenten mithilfe von Mastra Workflows.  
* **Root-Verzeichnis:** Enthält Konfigurationsdateien, Docker-Setup für die lokale DB und das DB-Initialisierungsskript.

Diese Struktur fördert Modularität und Trennung der Zuständigkeiten innerhalb des Projekts.