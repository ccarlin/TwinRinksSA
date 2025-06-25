const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const net = require("net");
const dotenv = require("dotenv");
const myKey = process.env.MY_KEY;
const IV = process.env.IV;

module.exports = {   
    encrypt: function(text) {
      let cipher = crypto.createCipheriv('aes-256-cbc', myKey, IV);
      let crypted = cipher.update(text,'utf8','hex')
      crypted += cipher.final('hex');

      return crypted;
    },
    decrypt: function(text) {
      let decipher = crypto.createDecipheriv('aes-256-cbc', myKey, IV)
      let dec = decipher.update(text,'hex','utf8')
      dec += decipher.final('utf8');

      return dec;
    },
    UpperCase: function(text) {
      let newText = text.charAt(0).toUpperCase() + text.slice(1);
      return newText;
    },
    logError: function(data, ipAddress) {
        this.logData(data, "ERROR", ipAddress);
    },
    logWarn: function(data, ipAddress) {
      this.logData(data, "WARN", ipAddress);
    },
    logData: function(data, level, ipAddress) {
      let message;

      if (!level)
        level = "INFO";

      if (data == null)
        data = "";

      let timestamp = new Date().toLocaleString();
      if (ipAddress)
      {        
        ipAddress = ipAddress.replace('::ffff:', '');       
        message = `${timestamp}\t[${level}]\tPID: ${process.pid}, IP: ${ipAddress}\t${data}`;
      }
      else
        message = `${timestamp}\t[${level}]\tPID: ${process.pid}, IP: N/A\t${data}`;

      //Don't log debug messages unless debugging..
      if (level == "ERROR") {
        console.error(message);
      }
      else  
        console.info(message);      
    }
};