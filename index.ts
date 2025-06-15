import Discord, { ActivityType } from 'discord.js';
import SuperClient from './extensions/SuperClient';
import CommandHandler from './extensions/CommandHandler';

// Initializing dotenv, prefix configuration
require('dotenv').config();
const prefix = process.env.PREFIX || '-';
console.log('\n');

// Initializing and configuring the client
const client = new SuperClient();
client.once('ready', () => {
    console.log('\n  ❱❱ Online. \n');
    client.user?.setPresence({ activities: [{
        name: 'Meropide+',
        type: ActivityType.Competing,
        url: 'https://meropide.com'
    }], status: 'dnd' });
});

// Setting up collections and handling commands
client.categories = [];
client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
CommandHandler(client);

// Handling message creation
client.on('messageCreate', async (message) => {

    //-- Prefix reminder handling
    if ((message.content.split(' '))[0] === `<@${client.user?.id}>`) 
        message.channel.send(`> Hello, my prefix is \`"${prefix}"\`.`);
    
    //-- Scrape command handling
    const ScrapeCommands = new Set(["!inv", "!inventory", "!mp", "!marketplace"]);
    const ScrapeQuery = message.content.toLowerCase().split(/ (.+)/);

    // Execute the command if its a scrape command
    if (ScrapeCommands.has(ScrapeQuery[0]) && ScrapeQuery.length > 2) {

        // Extract the queries and map them to key-value pairs
        const matches = [...ScrapeQuery[1].matchAll(/(\w+)=((\[[^\]]*\])|([^\s]+))/g)];
        const queries = matches.map(m => ({ key: m[1], value: m[2].trim() }));

        // Execute the command if it exists
        for (const { key } of queries) {
            const cmd = client.commands.get(key.toLowerCase())
                || client.commands.get(client.aliases.get(key.toLowerCase()));
            if (cmd) await cmd.default.run(client, message, queries);            
        }
        return;
    }

    //-- Regular command handling
    // If the message is from a bot, not in a guild, or does not start with the prefix, ignore it
    if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) 
        return;

    // If the message does not start with the prefix, ignore it
    const args = message.content.substring(prefix.length).split(" ");
    // Execute the command if it exists
    const cmd = client.commands.get(args[0].toLowerCase()) 
        || client.commands.get(client.aliases.get(args[0].toLowerCase()));
    if (cmd) return cmd.default.run(client, message, args.slice(1));
    
});

// Handling log-in
client.login(process.env.TOKEN); 