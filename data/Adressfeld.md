---
source: "https://handbuch.sellify.de/funktionen/adressfeld/"
---
In der Organisations- und Personenkarte in sellify finden Sie ein Adressfeld in Form eines Hyperlinks. In diesem Feld können Sie eine Besuchs- sowie eine Postadresse hinterlegen, auf die in Aktivitäten und Dokumenten zurückgegriffen wird. Ist die jeweilige Organisations- oder Personenkarte nicht im [Bearbeitungsmodus](https://handbuch.sellify.de/funktionen/stammdatens%C3%A4tze-bearbeiten/ "Stammdatensätze bearbeiten"), öffnet sich mit Klick auf den Adress-Hyperlink ein Browserfenster mit GoogleMaps, in dem die entsprechende Adresse geographisch angezeigt wird. Weitere Informationen dazu finden Sie [hier](https://handbuch.sellify.de/funktionen/adressen-aus-sellify-in-google-maps-%C3%B6ffnen/ "Adressen aus sellify in Google Maps öffnen").

  
Fährt man mit der Maus über den Hyperlink erscheint ein Tooltip, der die hinterlegten Adressen anzeigt. Ist für eine Organisation oder Person keine Adresse (außer Land=Pflichtfeld) hinterlegt, zeigt der Tooltip nur das entsprechende Land an. Ist eine Person eine Organisation zugeordnet und hat keine individuelle Adresse hinterlegt, zeigt der Hyperlink die Adresse der verknüpften Organisation. Bei Mouseover gibt der Tooltip eine entsprechende Erklärung aus: "Die dargestellte Adresse ist die Adresse der Organisation, da der Person keine eigene Adresse zugeordnet wurde. Durch Mausklick wird diese Adresse in GoogleMaps dargestellt."

Um bei der Neuanlage einer Organisation eine Adresse einzupflegen, wählen Sie im Stammdatenteil des neu erzeugten Datensatzes den Eintrag "Adresse eintragen". Es öffnet sich ein entsprechender Dialog, in dem das Land bereits mit Deutschland vorbelegt ist. Diese Auswahl können Sie anpassen, jedoch nicht leeren, da das Land als Pflichtfeld definiert ist, denn die Auswahl des Landes hat Einfluss auf die im Adressfeld zur Verfügung stehenden Felder sowie die Ausgabe der Adresse in Dokumenten. Weitergehende Informationen hierzu finden Sie im weiteren Verlauf dieses Artikels.

Im Falle von Organisationen wird zwischen Besuchs- und Postadresse unterschieden. Ihre Eingaben aus dem Bereich "Besuchsadresse" werden bei der Erstanlage in den Bereich "Postadresse" übernommen, können aber manuell verändert werden. Dieses Verhalten kann im sellify Admin deaktiviert werden, sofern nicht gewünscht. Mit Eingabe der Postleitzahl ergänzt sellify die Stadt und das Bundesland.

Ihre Angaben in der Besuchsadresse verwendet sellify künftig in Aktivitäten, genauer in der Zeile Ort, wo diese Besuchsadresse als eine der Optionen ausgegeben wird. Bei der Erstellung von Dokumenten greifen die Variablen in sellify auf die Postadresse zu.

![](https://image.jimcdn.com/app/cms/image/transf/dimension=713x10000:format=png/path/s42eb4d670de94a65/image/i8e37623b632b4a18/version/1701719731/image.png)

Die Angabe einer Adresse für Personen folgt grundsätzlich dem gleichen Prinzip wie oben für Organisationen beschrieben. Allerdings findet hier eine Unterscheidung zwischen der "Adresse" und der "abweichenden Postadresse" statt. Diese kommt zum Beispiel zum Einsatz, wenn die postalische Korrespondenz der betroffenen Person nicht an die Firmen- oder Meldeadresse sondern an eine abweichende, z.B. die Anschrift einer Zweigniederlassung versendet werden soll.

Wird die neue Person direkt aus der Organisation heraus über den Reiter "Personen" angelegt verknüpft sellify die Besuchsadresse dieser Organisation mit der Person. Im Regelfall ist so keine Anpassung der Adresse mehr erforderlich. Soll die Person jedoch eine zusätzliche Anschrift erhalten, muss diese mit Klick auf den Adresshyperlink hinterlegt werden. Soll auch die Korrespondenz an diese andere Anschrift versendet werden, muss die Auswahl mit der Checkbox "Korrespondenz an Personenadresse versenden" bestätigt werden.

![](https://image.jimcdn.com/app/cms/image/transf/dimension=683x10000:format=png/path/s42eb4d670de94a65/image/i821655d6964401ca/version/1701719733/image.png)

Das ausgewählte Land ist entscheidend für die Kommunikationssprache einer Organisation und/ oder Person, aber auch für die Formatierung der restlichen Adressfelder. Adressen werden in verschiedenen Ländern unterschiedlich geschrieben, z.B. formatiert man die Adresse in Deutschland:  
<Straße, Hausnr.> ; <PLZ> ; <Ort>;

![](https://image.jimcdn.com/app/cms/image/transf/dimension=690x10000:format=png/path/s42eb4d670de94a65/image/i7142c255b9fa4be0/version/1614091348/image.png)

in den Vereinigten Staaten jedoch folgendermaßen:  
<Straße, Hausnr.> ; <Adresszeile 2> ; <Ort> ; <Bundesstaat> ; <PLZ>.

![](https://image.jimcdn.com/app/cms/image/transf/dimension=690x10000:format=png/path/s42eb4d670de94a65/image/icaa6048a56e25d2d/version/1614091352/image.png)

Diese Formatierungsform passt sich mit Änderung des Landes an die geltenden Regelungen des Landes an.