---
source: "https://handbuch.sellify.de/funktionen/variablen-in-dokumenten-und-serienbriefvorlagen/"
---
[Variablen](https://handbuch.sellify.de/funktionen/variablen-in-dokumenten-und-serienbriefvorlagen/liste-der-variablen/ "Variablen") ermöglichen es, die Dokumenten- sowie [Serienbriefvorlagen](https://handbuch.sellify.de/funktionen/dokumente/serienbriefe-erzeugen/ "Serienbriefe erzeugen") vom Typ Word, Excel, PowerPoint und Text zu individualisieren.  
Wenn z.B. ein sellify-[User](https://handbuch.sellify.de/allgemein/benutzeroberfl%C3%A4che/ "Begriffe aus sellify, Aufbau von sellify") ein Dokument im Menüpunkt "Organisation" erstellt, werden alle Variablen, die mit der Organisation verknüpft sind, mit den dazugehörigen Daten befüllt (z.B. Organisationsname, Adresse der Organisation, usw.).  
Wenn ein sellify-User einen Serienbrief für mehrere Personen erstellt, kann mittels Variablen z.B. automatisch die Anrede im Serienbrief an die jeweiligen Personen angepasst werden.  

Eine Beschreibung zu den einzelnen Variablen finden Sie [hier](https://handbuch.sellify.de/funktionen/variablen-in-dokumenten-und-serienbriefvorlagen/liste-der-variablen/ "Variablen").

Um die [Variablen](https://handbuch.sellify.de/funktionen/variablen-in-dokumenten-und-serienbriefvorlagen/liste-der-variablen/ "Variablen") in einer Dokumentenvorlage nutzen zu können, werden die Kürzel (Expression) der entsprechenden Variablen benutzt. In E-Mail- und ".docx-Dokumentvorlagen" werden diese in geschweifte Klammern, "{" und "}", geschrieben.  
Variablenfelder können auch über Strg + F9 eingegeben werden, in diesem Fall werden die geschweiften Klammern eingefügt. Der Cursor befindet sich innerhalb der Klammern, sodass die Variable direkt eingefügt werden kann.  
In ".doc-Vorlagen" werden die Zeichen "<" und ">" verwendet. Zusätzlich müssen zwischen den Variablennamen und den ">" Leerzeichen hinzugefügt werden.  
Die Anzahl der Leerzeichen entspricht der maximalen Länge des Variableninhaltes - 6. Die Variable "onam" z.B. kann Werte bis zu 16 Zeichen speichern. Das bedeutet. dass zwischen "onam" und ">" 10 Leerzeichen vorhanden sein müssen.  
→ In .doc-Vorlagen sieht es so aus: <onam          >  
→ in .docx-Vorlagen sieht es so aus: {onam}

**.docx:**

![](https://image.jimcdn.com/app/cms/image/transf/dimension=292x10000:format=jpg/path/s42eb4d670de94a65/image/i709ef4f64e2535b3/version/1611231517/image.jpg)

**.doc:**

![](https://image.jimcdn.com/app/cms/image/transf/dimension=522x10000:format=png/path/s42eb4d670de94a65/image/i8cb002504a8306f9/version/1609939375/image.png)

In einem Dokument, dass Sie in sellify aus der Vorlage erstellen, werden die Werte der jeweiligen [Variablen](https://handbuch.sellify.de/funktionen/variablen-in-dokumenten-und-serienbriefvorlagen/liste-der-variablen/ "Variablen") ausgegeben. Ist in einem der mit Variablen abgefragten Feldern kein Wert vorhanden, wird nichts angegeben.

Klickt man in sellify im Bereich "[Selektion](https://handbuch.sellify.de/aufbau/selektion/ "Selektion")" den [Menü](https://handbuch.sellify.de/funktionen/men%C3%BC-funktionen/ "Menü-Funktionen") und wählt "[Serienbrief erstellen](https://handbuch.sellify.de/funktionen/dokumente/serienbriefe-erzeugen/ "Serienbriefe erzeugen")", werden im sich öffnenden Dialogfenster alle möglichen [Variablen](https://handbuch.sellify.de/funktionen/variablen-in-dokumenten-und-serienbriefvorlagen/liste-der-variablen/ "Variablen") angezeigt; die gewünschten sind auszuwählen (vgl. [Serienbriefe erzeugen](https://handbuch.sellify.de/funktionen/dokumente/serienbriefe-erzeugen/ "Serienbriefe erzeugen")).  
Wie in den Dokumentenvorlagen werden auch in Serienbriefvorlagen Kürzel benutzt. Hier ist der Unterschied, dass die Kürzel von "«»" umklammert werden.

z.B.

![](https://image.jimcdn.com/app/cms/image/transf/dimension=550x10000:format=png/path/s42eb4d670de94a65/image/iee48275b7feae75f/version/1609939493/image.png)

Die Variable "sign" gibt die E-Mail Unterschrift des in sellify angemeldeten Users als Bild wieder; sofern im admin auch ein Bild hinterlegt ist. In E-Mail Vorlagen und normalen Word-Vorlagen kann die Variable über {sign} eingefügt werden.  
In Serienbrief-Word-Vorlagen ist dabei eine Besonderheit zu beachten: um die Unterschrift des Anwenders auszugeben, ist folgende Variable einzufügen:

{ IF { MERGEFIELD sign } <> "" { INCLUDEPICTURE "{ MERGEFIELD sign }" } }

So wird sichergestellt, dass die Unterschrift, sofern sie im admin hinterlegt ist, korrekt ausgegeben wird - ist keine Unterschrift hinterlegt, wird in der Word-Dateien nichts ausgegeben; auch keine nicht umwandlungsfähige Variable.

Zusätzlich sollte die Variable in einem Textfeld, welches bereits die für die Unterschrift gewünschte Größe besitzt, eingesetzt werden. Dabei ist zu beachten, dass das Textfeld eine einfarbige Füllung mit einer Farbtransparenz von 100% hat, um sicherzustellen, dass die Unterschrift auch der Größe des Textfeldes entspricht.  
Hinweis: die sign-Variabel wird nicht nicht in ".doc-Dateien" unterstützt; bitte verwenden Sie "docx-Dateien".  
Für den Fall, dass Sie eine ".doc-Datei" oder eine ".docx-Datei, die ursprünglich aus einer ".doc-Datei" entstanden ist, verwenden, empfehlen wir, die Inhalte in eine neue ".docx-Datei" umzuziehen, indem Sie die Inhalte kopieren und in die ".docx-Datei" einfügen.

![](https://image.jimcdn.com/app/cms/image/transf/dimension=690x10000:format=png/path/s42eb4d670de94a65/image/ife5f1c912471268f/version/1614093638/image.png)