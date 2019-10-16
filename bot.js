const Discord = require('discord.js');
const client = new Discord.Client();
function getGuildInventory(message)
{
    var request = require("request-promise");
    var options = {
        method: 'POST',
        uri: 'https://classicguildbankapi.azurewebsites.net/api/auth/login',
        headers: {'Content-Type': 'application/json' },
        body: {
            guildToken: "",
            password: process.env.CBG_PASS,
            username: "Chanced270"
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
            .setTitle(charactersArray[i].name).setColor(3426654).setDescription("Guild Bank Dev").setFooter("Please note this bot is currently under development.");


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
client.on('ready', ()=>{
    client.user.setPresence({game : {name: "Playing !guildbank * !gbhelp"}, status: "online"});
    console.log('I am ready!');
});

client.on('message', message => {
    if (message.content.startsWith("!gbroles"))
    {
        message.guild.roles.find(function (value, key, collection, role) {
            console.log("Value: " + value);
            console.log("Key: " + key);
            console.log("COLLECTION: ");
            console.log(collection);
            console.log("Role: " + role);
        });
        return;
    }
    if (message.content.startsWith('!guildbank') || message.content.startsWith("!gb")){
        getGuildInventory(message);
    }
    if (message.content.startsWith("!gbhelp")){
        message.reply("Use !guildbank to get each guild bank characters inventory.")
    }
});

client.login(process.env.BOT_TOKEN);