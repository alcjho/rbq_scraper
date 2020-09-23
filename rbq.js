const config = require('./config');
const dbconfig = require('./dbconfig');
const fs = require('fs');
const fn = require('./rbq_scrapper');
const schedule = require('node-schedule');
const automail = require('./automail');



// console.log("-----------------------------------------------------------------------------");
// console.log("STARTING FIRST ROPE ON " + fn.currentDateTime());
// console.log("-----------------------------------------------------------------------------");

//fn.checkRbqForVerifiedContractor(10);
 fn.checkRbqForLeavingContractor(10);

//create a schedule for active subscriber
var secondes = "";     // (0-59) optional
var minutes = "*/25";     // (0-59) required
var hour = "20";         // (0-23) required
var day_of_month = "*"; // (1-31) required
var month = "*";        // (1-12) required
var day_of_week = "*";  // (0-7) required : 0 or 7 is Sun
secondes = (secondes != "")? secondes + ' ' : '';
let scrapschedule1 = minutes +' '+ hour +' '+ day_of_month +' '+ month +' '+ day_of_week;


console.log("Idle state - waiting for scheduler...");

//launch the task for active subscribers
var task1 = schedule.scheduleJob(scrapschedule1, async function(){
    console.log("-----------------------------------------------------------------------------");
    console.log("ACTIVE SUBSCRIBER - ROPE SARTED ON " + fn.currentDateTime());
    console.log("-----------------------------------------------------------------------------");
    await fn.checkRbqForVerifiedContractor(300);
});


//create a schedule for leaving subscriber
secondes = "";     // (0-59) optional
minutes = "*/10";     // (0-59) required
hour = "6";         // (0-23) required
day_of_month = "*"; // (1-31) required
month = "*";        // (1-12) required
day_of_week = "*";  // (0-7) required : 0 or 7 is Sun

secondes = (secondes != "")? secondes + ' ' : '';
let scrapschedule2 = minutes +' '+ hour +' '+ day_of_month +' '+ month +' '+ day_of_week;


//launch the task for leaving subscribers
var task2 = schedule.scheduleJob(scrapschedule2, async function(){
    console.log("-----------------------------------------------------------------------------");
    console.log("LEAVING SUBSCRIBER - ROPE SARTED ON " + fn.currentDateTime());
    console.log("-----------------------------------------------------------------------------");
    await fn.checkRbqForLeavingContractor(100);
});
