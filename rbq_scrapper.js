/**
 * @description Core module of rbq scrapping contains all functions to retrieve data from https://www.pes.rbq.gouv.qc.ca/RegistreLicences/Recherche?mode=Entreprise 
 * @author louis.jhonny@mgail.com 2020-10-23
 * @version 1.0
 * 
 **/
 
const puppeteer = require('puppeteer');
const config = require('./config');
const dbconfig = require('./dbconfig');
var mysql = require('mysql2/promise');
const automail = require('./automail');
const fs = require('fs');

const pool = mysql.createPool(dbconfig.srv5);

const verifyRBQ = async (url, rbq_number, rbq_exp, contractor, leaving) =>{
	let rbq = rbq_number;

    // 1- Load the first url and jquery librairy
    const browser = await puppeteer.launch({headless: true, args:['--no-sandbox', 'disabled-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(10000);
	
	try{
	await page.goto(url, {waitUntil: 'domcontentloaded'});
	await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.5.1.min.js'});
    
    if(rbq !== undefined){

        rbq = rbq.replace(/\D/g, "").replace(/\s/g,"");
        
        if(rbq.length < 8){
            console.log('Wrong rbq format: ' + rbq);
        }else{
            // Put the focus in the RBQ license field
            await page.focus("#noLicence");
        
            // Type in the rbq number 
            await page.keyboard.type(rbq);  
            
            // then click the submit button
            // wait for the browser to complete the request.
            // and pass the result to result variable
            await Promise.all([
                page.click("#wrapper > div > div > form > fieldset > div > button"),
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);

            result = await page.evaluate(() => {
                return $("#wrapper > div > div > div.resume-fiche").length;
            })
    
            // Test the result and return the outcome.
            if(result !== undefined){
                
                // update failure in database
                let affrows = await updateRBQ(rbq, false);

                switch(result){
                case 0:
                    // send email to admin for unverified rbq
                    if(!leaving){
                        //await notifyUnverifiedRbqToAdmin(rbq, rbq_exp, contractor);
                        let rbqinfo = {rbq: rbq, rbq_exp: rbq_exp, contractor:contractor, status: 'UnverifiedRBQ for active subscriber'};
                        await updateNotificationBatch(rbqinfo);         
                    }


                    
                    // Log result
                    await browser.close();
                    return {"date":currentDateTime(),  "error": "The rbq number : " + rbq_number + " was not found in our database"};
                case 1:
                    // update success in database
                    let affrows = await updateRBQ(rbq, true);


                    // send email to admin for verified rbq
                    if(leaving){
                        //await notifyVerifiedRbqToAdmin(rbq, rbq_exp, contractor);
                        let rbqinfo = {rbq: rbq, rbq_exp: rbq_exp, contractor:contractor, status: 'Verified RBQ for leaving subscriber'};
                        await updateNotificationBatch(rbqinfo);         
                    }
                    
                    // Log result
                    await browser.close();
                    return {"date":currentDateTime(), "success":"rbq number : " + rbq_number + " has been found!"};
                default:
                    await browser.close();
                    return {"date":currentDateTime(), "error":"unknown error while verifying rbq number : " + rbq_number + " Try again later"};
                }
            }
        }
    }else{
        await browser.close();
        return {"error":"RBQ number cannot be empty"};
    }
	}catch(e){
	    await browser.close();
		return {"date":currentDateTime(), 'error': "Connection timed out while verifying rbq number : " + rbq_number  + ". The system will try again later"};
	}
	
	await browser.close();
}


const updateNotificationBatch = async (data) => {
     // create the connection
     const connection = await mysql.createConnection(dbconfig.srv5);
     // query database
     connection.execute("INSERT INTO sr_rbq_batch(sn_cdate, sn_mdate, rbq_number, rbq_exp_date, company_name, batch_name) VALUES(?, ?, ?, ?, ?, ?)", [currentDateTime(),currentDateTime(),data.rbq, data.rbq_exp, data.contractor, data.status],
     
     function(err, results, fields) {
        console.log(results); // results contains rows returned by server
        console.log(fields); // fields contains extra meta data about results, if available
      }
    );
}


/**
 * 
 * @param {*} rbq 
 * @desc updateRBQ function : used to put a flag on rbq that has been updated
 */
const updateRBQ = async function(rbq, verified){

    
    const update_query = "UPDATE sr_contractor SET auto_check_RBQ_date = ?, rbq_verified = 'yes' WHERE replace(rbq, '-', '')+0 = ?";
    
    if(!verified){
        const update_query = "UPDATE sr_contractor SET auto_check_RBQ_date = ?, rbq_verified = 'no' WHERE replace(rbq, '-', '')+0 = ?";
    }

    const result = await pool.query(update_query, [currentDateTime(), rbq]);
    return result[0].affectedRows;
}

const currentDateTime = function(){
    currentdate = new Date();
    var datetime = currentdate.getFullYear() + "-"
    + AddZero((currentdate.getMonth()+1))  + "-" 
    + AddZero(currentdate.getDate()) + " "  
    + AddZero(currentdate.getHours()) + ":"  
    + AddZero(currentdate.getMinutes()) + ":" 
    + AddZero(currentdate.getSeconds());  
    return datetime;  
}

const filterRbq = function (rbq_number) {
    regex = /^[ .()-]*(\d[ .()-]*){10}$/g;
    regex1 = /[\d -]+/g;
    regex2 = /[\d]/g;
    rbq = regex.test(rbq_number);
    console.log(rbq);
}

const checkRbqForVerifiedContractor = async (limit) => {
    // create the connection
    const connection = await mysql.createConnection(dbconfig.srv5);
    // query database
    const [rows, fields] = await connection.execute("SELECT c.uid, c.rbq, c.rbq_exp, c.company_name FROM sr_contractor c inner join sr_contractor_territory ct on ct.uid_contractor = c.uid inner join sr_territory t on t.uid = ct.uid_territory AND t.uid_province = 1 WHERE LENGTH(c.rbq) >= 8 AND LENGTH(c.rbq) <= 12 AND c.active = 'yes' AND c.verified = 'yes' AND (c.rbq != null OR c.rbq != '') AND (c.auto_check_RBQ_date <  NOW() - INTERVAL 1 MONTH OR c.auto_check_RBQ_date IS NULL) GROUP BY c.uid ORDER BY c.auto_check_RBQ_date LIMIT ?", [limit]);
    
    for(let i=0;i<rows.length;i++){
        let result = await verifyRBQ(config.config_rbq.baseSiteUrl, rows[i].rbq, rows[i].rbq_exp, rows[i].uid);
        console.log(result);
    }
}


const checkRbqForLeavingContractor = async (limit) =>{
    // create the connection
    const connection = await mysql.createConnection(dbconfig.srv5);
    // query database
    const [rows, fields] = await connection.execute("SELECT uid, active, verified, leaving_reason, rbq, rbq_exp, company_name FROM sr_contractor where rbq REGEXP '^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$' AND LENGTH(rbq) >= 10 AND LENGTH(rbq) <= 12 AND leaving_reason = 'rbq' AND (active <> 'yes' OR verified <> 'yes') AND rbq_exp > curdate() - interval 2 year AND length(rbq) >= 8 ORDER BY auto_check_RBQ_date LIMIT ?", [limit]);
    
    for(let i=0;i<rows.length;i++){
        let result = await verifyRBQ(config.config_rbq.baseSiteUrl, rows[i].rbq, rows[i].rbq_exp, rows[i].uid, 'leaving');
        console.log(result);
    }
}

const notifyUnverifiedRbqToAdmin = async function(rbq, rbq_exp, contractor){
    // let rawdata = fs.readFileSync('rbq_batch.json');
    // let rbq_batch = JSON.parse(rawdata);

    let email_subject = 'Active subscriver rbq: '+ rbq +' is not verified';

    let email_from = 'pros@renoquotes.com';
    let email_to = 'noreply@soumissionrenovation.ca';
    let email_body = "Bonjour<br> Ceci pour vous notifier que le numero rbq : " 
                    + rbq + " n'a pas pu être vérifié pour l'entrepreneur " + contractor
                    + "<br>d'après nos informations la licence devrait expirée le " + rbq_exp
                    + "<br><br>https://ssrv5.sednove.com/fr/stats_contractors?id_contractor=" + contractor;
    
    let response = automail.send( email_from, email_to, email_subject, email_body, 'sendRBQUnverifiedNoticeToAdmin');

}

const notifyVerifiedRbqToAdmin = async function(rbq, rbq_exp, contractor){
    let email_subject = 'Leaving subscriber rbq: '+ rbq +' has been successfully verified';

    let email_from = 'pros@renoquotes.com';
    let email_to = 'noreply@soumissionrenovation.ca';
    let email_body = "Bonjour<br> Ceci pour vous notifier que le numéro rbq : " 
                    + rbq + " est toujours valable pour l'entrepreneur " + contractor
                    + "<br>d'après nos informations la licence devrait expirée le " + rbq_exp
                    + "<br><br>https://ssrv5.sednove.com/fr/stats_contractors?id_contractor=" + contractor;
    
    let response = automail.send( email_from, email_to, email_subject, email_body, 'sendRBQVerifiedNoticeToAdmin');
}

/**
 * 
 * @param {*} num 
 */
function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}

exports.currentDateTime = currentDateTime;
exports.checkRbqForVerifiedContractor = checkRbqForVerifiedContractor;
exports.checkRbqForLeavingContractor = checkRbqForLeavingContractor;
exports.filterRbq = filterRbq;
