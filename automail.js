const nodemailer = require('nodemailer');
const smtp = require('./smtp_config')
const transport = nodemailer.createTransport(smtp.config);

const templates = {
    "default": {
        "header": "",
        "footer": "<br><hr>L'équipe soumissionrenovation.ca"
    },
    "sendRBQUnverifiedNoticeToAdmin": {
        "name": "rbq_template",
        "header": "Un message concernant la vérification de la RBQ d'un entrepreneur inactif ou non-verifié<hr><br>",
        "footer": "<br><hr><div style='width:100%;height:50px;color:#dddddd;font-size:1.5em;border:radius;text-align=center'> L'équipe de soumissionrenovation.ca </div>"
    },
    "sendRBQVerifiedNoticeToAdmin": {
        "name": "sendRBQVerifiedNoticeToAdmin",
        "header": "Un message concernant la vérification de la RBQ d'un entrepreneur inactif ou non-verifié<hr><br>",
        "footer": "<br><hr><div style='width:100%;height:50px;color:#dddddd;font-size:1.5em;border:radius;text-align=center'> L'équipe de soumissionrenovation.ca </div>"
    } 
}

const send = function(email_from, email_to, email_subject, message, template_name){
    let template = 'default';
    
    if(template_name){
        if(!templates[template_name]) {
             template = template_name;   
        }
    }
    
    const body = {
        from: email_from,
        to: smtp.admin, 
        subject: email_subject,
        html: templates[template].header + message + templates[template].footer

    }

    transport.sendMail(body, function(err, info){
        if(err){
            consooe.log(err);
        }else{
            console.log(info);
        }
    });
}


const template = function(name, header, footer){
    templates[name].header = header;
    templates[name].footer = footer;
}

exports.send = send;
exports.template = template;
