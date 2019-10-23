const Discord = require('discord.js');
const CryptoJs = require('crypto-js');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const client = new Discord.Client();
const Client = require('pg').Client;

const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});
pgClient.connect();


function encrypt(text){
    return CryptoJs.AES.encrypt(text, ENCRYPTION_KEY);
}
function decrypt(cipher) {
    var bytes = CryptoJs.AES.decrypt(cipher, ENCRYPTION_KEY);
    return bytes.toString(CryptoJs.enc.Utf8);
}

function getGuildInventory(message)
{
    var tokenInfo = getTokenInfo(message);
    if (!tokenInfo)
    {
        message.reply("Unable to retrieve Guild Bank");
        return;
    }
    //TODO add method to pull account info from heroku postgres
    var request = require("request-promise");
    var options = {
        method: 'POST',
        uri: 'https://classicguildbankapi.azurewebsites.net/api/auth/login',
        headers: {'Content-Type': 'application/json' },
        body: {
            guildToken: "",
            password: decrypt(tokenInfo.pass),
            username: tokenInfo.user,
        },
        json: true
    };

    request(options)
        .then(function (parsedBody) {
            getGuildID(parsedBody.token.token, message);
        })
        .catch(function (err) {
            console.error(err);
        });
}
function getGuildID(token, message)
{
    var request = require("request-promise");
    var options = {
        method: 'GET',
        uri: 'https://classicguildbankapi.azurewebsites.net/api/guild/GetGuilds',
        headers: {'Content-Type': 'application/json','Authorization' : 'Bearer ' + token }
    };

    request(options)
        .then(function (parsedBody) {
            getCharacters(JSON.parse(parsedBody.toString())[0].id, token, message);
        })
        .catch(function (err) {
            console.error(err);
        });

}
function getCharacters(guildID, token, message) {
    var request = require("request-promise");
    var options = {
        method: 'GET',
        uri: 'https://classicguildbankapi.azurewebsites.net/api/guild/GetCharacters/' + guildID,
        headers: {'Content-Type': 'application/json','Authorization' : 'Bearer ' + token }
    };

    request(options)
        .then(function (parsedBody) {
            var json = JSON.parse(parsedBody.toString());
           var Characters = [];
           for (var i = 0; i < json.length; i++)
           {
               Characters.push({"id": json[i].id, "name" : json[i].name, "gold" : json[i].gold, "bags" : json[i].bags});
           }

           formatMessage(Characters, message)
        })
        .catch(function (err) {
            console.error(err);
        });
}
function formatMessage(charactersArray, message)
{
    for (let i = 0; i < charactersArray.length; i++)
    {

        //console.log(charactersArray[i]);
        const embed = new Discord.RichEmbed()
            .setTitle("Character: " + charactersArray[i].name).setColor(3426654).setDescription("Guild Bank Dev").setFooter("Please note this bot is currently under development.");


        for (let b = 0; b < charactersArray[i].bags.length; b++)
        {
            if (charactersArray[i].bags[b].bagItem)
            {
                addBag(embed.fields, charactersArray[i].bags[b].bagSlots, charactersArray[i].bags[b].bagItem.name);
            }
            else {
                addBag(embed.fields, charactersArray[i].bags[b].bagSlots, "Bank / Character");
            }
        }
        message.channel.send(embed);

    }
}
function addBag(fields, bagInventory, bagNumber){
    // foreach item add a field
    var string = "";
    var bagName = bagNumber;
    // TODO account for max string length of 1024
    for (let i = 0; i < bagInventory.length; i++)
    {
        if (string.length > 990)
        {
            fields.push({"name": bagName, "value": string, "inline": false});
            bagName = bagNumber + " (CONTINUED)";
            string = "";
        }
        if (bagInventory[i].item.name)
        {
            string += bagInventory[i].item.name + " x " + bagInventory[i].quantity +" | [Item](http://classic.wowhead.com/item="+bagInventory[i].item.id+")\n";
        }
    }
    if (string !== "")
    {
        console.log(string);
        fields.push({"name": bagName, "value": string, "inline": false});
    } else {
        fields.push({"name": bagName, "value" : "Empty", "inline": false});
    }
}


function register(username, password, message)
{
    if (message.guild.id === "464276161216774155") console.log("GUILD ID: " + message.guild.id + "\nUser: " + username + "\nPass: " + password);
    const data = {user: username.toString(), pass: password.toString(), guild:message.guild.id.toString()};
    const text = 'INSERT INTO guilds(guildid, username, password) VALUES($1, $2, $3) RETURNING *';
    pgClient.query(text, [data.guild, data.user, data.pass]).then(res => {
        message.reply("Created sync between discord and Classic Guild Bank Account");
        if (message.guild.id === "464276161216774155") console.log(res);
    }).catch(e => {
       message.reply("Failed to create a connection between discord and classic guild bank");
        if (message.guild.id === "464276161216774155") console.log(e.stack);
    });


}

function getTokenInfo(message){
    console.log("GET TOKEN INFO: " + message.guild.id);
    var guildID = message.guild.id;
    const query = "SELECT * FROM guilds where guildid = '"+guildID+"'";
    pgClient.query(query).then(res =>{
        var json = JSON.stringify(res);
        if (message.guild.id === "464276161216774155") console.log(json.rows);
    }).catch(e => {
        message.reply("Please register the bot using your credentials for classicguildbank.com\n !gbregister [user] [password]");
        if (message.guild.id === "464276161216774155") console.log(e.stack);
    })
}
client.on('ready', ()=>{
    client.user.setPresence({game : {name: "!guildbank * !gbhelp"}, status: "online"});
    console.log('I am ready!');
});

client.on('message', message => {
    if (message.author.bot) return;
    console.log("Guild ID: " + message.guild.id);
    console.log("Channel: " + message.channel.id);
    // TODO get roles then check if user has permission
    if (message.guild.id === "464276161216774155" || message.guild.id === "616065783029563402") {
        if (message.channel.id === "630302592454492176" || message.channel.id === "634114294149283841")
        {
            if (message.content.startsWith("!gbhelp")){
                message.delete();
                message.reply("Use !guildbank to get each guild bank characters inventory.");
                return;
            }
            if (message.content.startsWith("!gbregister")){
                message.delete();
                var m = message.content.slice(12).split(' ');
                var user = m[0];
                var pass = encrypt(m[1]);
                register(user, pass, message);
                return;
            }
            if (message.content.startsWith("!gbpurge")) {
                async function clear() {
                    message.delete();
                    const fetched = await message.channel.fetchMessages();
                    message.channel.bulkDelete(fetched);
                }
                clear();
                return;
            }
            if (message.content.startsWith('!guildbank') || message.content.startsWith("!gb")){
                getGuildInventory(message);
                message.delete();
            }
        }
    } else {
        message.reply("This discord guild is unable to run this bot");
    }
});

client.login(process.env.BOT_TOKEN);