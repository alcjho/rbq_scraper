## PROJECT NAME: RBQ scraper

Créer un outil logiciel qui verifie un numero de license RBQ directement sur le site du gouvernement, en utilisant la technologie du web scrapping.



### Principaux  composants du système

1. Gestionnaire de taches	

   ​	**package**: node-scheduler
   ​	**Description**: executer une tache recurrente suivant une cedule donnée

2. Gestionnaire de courriel

   ​	**package**: nodemailer
   ​	**Description**: gérer la création et l'envoi de courriels

3. Scraper

   ​	**package**: Puppeteer
   ​	**Description**: Faire du scrapping en utilisant une instance du navigateur web chromium.



### Application

- #### Type d'application

  1. **Server headless:** 
     - non-securisé
     - 
  2. **Securité**: 
     - non-securisé
       

- #### Fonctionnalité

  - Gestionnaire de courriel

    - automail.send()
      envoyer un courriel avec en parametres 'to', 'from', 'subject', 'message' et 'template';
    - automail.template() permet de créer un gabarit assez rapidement pour un courriel quelconque.

  - Gestionnaire de taches

    - Le scheduler est utiliser pour programmer le lancement de la verification des numeros rbq par batch de taille fixe, en suivant une cédule qui peut être parametrée.

  - Web scrapping

    - Ce module représente l'essence de l'application a pouvoir se connecter sur le site web de la rbq avec le navigateur web chromium et naviger suivant le même scénario d'un utilisateur. Ceci est nécéssaire vu que l'application web n'offre aucun API pour cette fonctionnalité.

      **Puppeteer** est une librairie très connue pour faire du web scrapping. Elle permet d'assurer la verification du rbq sur le site https://www.pes.rbq.gouv.qc.ca/RegistreLicences/Recherche?mode=Entreprise. 

      **verifiedRBQ**() : est la methode principale qui est appelé a jouer le scénario sur le siteweb et retourne le status du rbq trouvé (verifié ou non-verifié). 

      - Si un rbq est trouvé il le signale dans le fichier log **logs/rbq_log.txt**
      - sinon, un email est envoyé a l'administration pour notifier un numéro RBQ non-verifié, pour faciliter le suivis avec l'entrepreneur.
        

      **checkRbqForVerifiedContractor**() : Va a travers la liste complète des entrepreneur qui sont **verifiés** et **actifs** et avec un rbq au moins avec le bon format (minimum 7 caractères, que des chiffres). 

      **NB**: Cette fonction opère seulement en batch. La verification se fait seulement une fois pour chaque numero dans la période cédulé.

      **checkRbqForLeavingContractor**() : Va a travers la liste des entrepreneur qui sont **verifiés** ou **actifs** et qui ont laissé **8 mois** de cela pour la raison **RBQ**.

      **NB**: Cette fonction opère seulement en batch. La verification se fait seulement une fois pour chaque numero dans la période cédulé.

      

- #### Installation

  - Cloner le projet a partir de github  `git clone https://github.com/alcjho/rbq_scraper.git`

  - Créer les fichiers de configuration.

    - ./smtp_config , ajouter le contenu suivant dans un environnement de test après avoir configurer votre compte sur smtp.mailtrap.io ( remplacer **user** et **pass** ) :

      `const config = { 
      	host: "smtp.mailtrap.io",
      	port: "2525",
      	auth: {
      		user: "ccff8b40c9281d",
      		pass: "a8f76f283e5c40"
      	}`
      `};`
      `exports.config = config;`
      
    - ./smtp_config , ajouter le contenu suivant dans en production:
      

    `const config = { 
      	host: "soumissionrenovation.ca",
    	port: "2525"
      };`
      `exports.config = config;`

    - ./dbconfig.js - ajouter cette le contenu suivant en remplacant les valeurs avec celles de votre base de données

      `const srv5 = {`

        `host: 'localhost',`

        `user: 'manager',`

        `database: 'srv5',`

        `password: '_Passwd01',`

        `waitForConnections: true,`

        `connectionLimit: 10,`

        `queueLimit: 0`

      `};`

      `exports.srv5 = srv5;`

    - ./config.js - ce fichier de configuration est imporant pour le scraper. Ajouter le contenu suivantconst 


      `config = {`

        	`baseSiteUrl: https://www.kijiji.ca/b-skilled-trades/canada/c76l0,`
        
        	`startUrl: https://www.kijiji.ca/b-skilled-trades/canada/c76l0,`
        
        	`concurrency: 10,`
        
        	`maxRetries: 3, 	`

        	`logPath: './logs/'`

      ​  `};`

      

      `const config_rbq = {`

        	`baseSiteUrl: https://www.pes.rbq.gouv.qc.ca/RegistreLicences/Recherche?mode=Entreprise,`

      `}`

      

      `exports.config = config;`

      `exports.config_rbq = config_rbq;`

    - Finalement installer les librairies nodejs avec la commande suivante, et c'est parti!

      ##### npm install

    - Lancer l'application

      ##### node index.js

      

- ## Versions

  - v1.0 - publiée par louis.jhonny@gmail.com - 2020-08-17
  - v1.1 : Ajout d'un module email avec nodemailer - Modifiée par louis.jhonny@gmail.com - 2020-08-20
