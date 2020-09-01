const nodemailer = require('nodemailer');
const smtp = require('./smtp_config')
const transport = nodemailer.createTransport(smtp.config);

const templates = {
    "default": {
        "header": "",
        "footer": "<br><hr>L'équipe soumissionrenovation.ca"
    },
    "jhonny": {
        "name": "jhonny",
        "header": "Un message concernant la verfification de la RBQ d'un entrepreneur<hr><br>",
        "footer": "<br><hr><div style='width:100%;height:50px;color:#dddddd;font-size:1.5em;border:radius;text-align=center'> L'équipe de soumissionrenovation.ca </div>"
    } 
}

const send = function(email_from, email_to, email_subject, message, template_name){
    const body = {
        from: email_from,
        to: email_to, 
        subject: email_subject,
        html: templates[template_name].header + message + templates[template_name].footer

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
    template[name].header = header;
    template[name].footer = footer;
}

exports.send = send;
exports.template = template;
