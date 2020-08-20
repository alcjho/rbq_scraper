const puppeteer = require('puppeteer');
const config = require('./config');
const dbconfig = require('./dbconfig');
var mysql = require('mysql2/promise');
const { forEach, find } = require('lodash');
const sendmail = require('sendmail');

const pool = mysql.createPool(dbconfig.srv5);

const verifyRBQ = async (url, rbq_number, rbq_exp) =>{

    // 1- Load the first url and jquery librairy
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(10000);
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.5.1.min.js'});
    
    let rbq = rbq_number;

    if(rbq !== undefined){
        rbq = rbq.replace(/\D/g, "").replace(/\s/g,"");
        
        if(rbq.length != 10){
            console.log('Wrong rbq format: ' + rbq);       
        }else{
            // Put the focus in the RBQ license field
            await page.focus("#noLicence");
        
            // Type in the rbq number 
            await page.keyboard.type(rbq);  
            
            try{
                // then click the submit button
                // wait for the browser to complete the request.
                // and pass the result to result variable
                await Promise.all([
                        page.click("#wrapper > div > div > form > fieldset > div > button"),
                        page.waitForNavigation({ waitUntil: 'networkidle0' }),
                ]);
            }catch(err){
                return {'error': {'type':'connect', 'message':"Connection timed out while verifying rbq number : " + rbq + ". Verify the number and try again later"}}
            }            
        }

        result = await page.evaluate(() => {
            return $("#wrapper > div > div > div.resume-fiche").length;
        })

        // Test the result and return the outcome.
        if(result !== undefined){
            switch(result){
            case 0:
                // update failure in database
                await updateRBQ(rbq, false);
                // send email to admin for unverified
                await notifyUnverifiedRbqToAdmin(rbq, rbq_exp);
                // Log result
                return {"error": "The rbq number : " + rbq + " was not found in our database"};
            case 1:
                // update success in database
                await updateRBQ(rbq, true);
                // Log result
                return {"success":"rbq number : " + rbq + " has been found!"};
            default:
                return {"error":"unknown error while verifying rbq number : " + rbq + " Try again later"};
            }
        }
    }else{
        return {"error":"RBQ number cannot be empty"};
    }
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

const checkRbqForVerifiedContractor = async (limit) => {
    // create the connection
    const connection = await mysql.createConnection(dbconfig.srv5);
    // query database
    const [rows, fields] = await connection.execute("SELECT uid, rbq, rbq_exp FROM sr_contractor WHERE active = 'yes' AND verified = 'yes' AND (rbq != null OR rbq != '') AND (rbq != null OR rbq != '') AND (DATE(auto_check_RBQ_date) < DATE(now()) OR auto_check_RBQ_date IS NULL) ORDER BY auto_check_RBQ_date LIMIT ?", [limit]);
    
    for(let i=0;i<rows.length;i++){
        let result = await verifyRBQ(config.config_rbq.baseSiteUrl, rows[i].rbq, rows[i].rbq_exp);
        console.log(result);
    }
}

const checkRbqForLeavingContractor = async (limit) =>{
    // create the connection
    const connection = await mysql.createConnection(dbconfig.srv5);
    // query database
    const [rows, fields] = await connection.execute("SELECT uid, active, verified, leaving_reason, rbq, rbq_exp FROM sr_contractor where leaving_reason = 'rbq' AND (active <> 'yes' OR verified <> 'yes') AND rbq_exp > curdate() - interval 2 year AND length(rbq) >= 8 ORDER BY auto_check_RBQ_date LIMIT ?", [limit]);
    
    for(let i=0;i<rows.length;i++){
        let result = await verifyRBQ(config.config_rbq.baseSiteUrl, rows[i].rbq, rows[i].rbq_exp);
        console.log(result);
    }
}

const notifyUnverifiedRbqToAdmin = async function(){
    const sendmail = require('sendmail')();
 
    sendmail({
        from: 'no-reply@localhost',
        to: 'louis.jhonny@gmail.com',
        subject: 'test sendmail',
        html: 'Mail of test sendmail ',
      }, function(err, reply) {
        console.log(err && err.stack);
        console.dir(reply);
    });

    console.log("Email sent to admin...");
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

