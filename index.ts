
    import Discord from 'discord.js';
    import SuperClient from './extensions/super_client';

    require('dotenv').config();
    const Prefix = process.env.PREFIX || '-';
    console.log('\n');

    const client = new SuperClient();
    client.once('ready', () => {

        console.log('\n  ❱❱ Online. \n');
        client.user?.setPresence({ activities: [{
            name: 'commands',
            type: 'WATCHING',
        }], status: 'dnd' });
    });

    client.commands = new Discord.Collection();
    client.aliases = new Discord.Collection();
    client.categories = [];

    import Handler from './extensions/command_handler';
    Handler(client);

    client.on('messageCreate', async (message) => {

        if (message.content.includes("!inv") && message.content.includes("grab=y")) {
    
            let msgs = "";
            setTimeout(() => {
                message.channel.messages.fetch({ limit: 3 }).then(messages => {

                    const lastMessage = messages.find(msg => msg.author.id === "730104910502297670");
                    if (!lastMessage) return message.channel.send({content: "No results found."});

                    lastMessage.embeds[0].fields.forEach(field => {
                        msgs += field.value.split('\n')[0] + " ";
                    });
                    
                }).catch(console.error).finally(() => {
                    message.channel.send({content: msgs || "No results found."});
                });
            }, 1000);
        }
        
        if ((message.content.split(' '))[0] === `<@${client.user?.id}>`) 
            message.channel.send(`> Hello, my prefix is \`"${Prefix}"\`.`);
        if (message.author.bot || !message.guild || !message.content.startsWith(Prefix)) 
            return;
        
        const args = message.content.substring(Prefix.length).split(" ");
        const cmd = client.commands.get(args[0].toLowerCase()) 
            || client.commands.get(client.aliases.get(args[0].toLowerCase()));
        if (cmd) cmd.default.run(client, message, args.slice(1));
        
    });

    client.login(process.env.TOKEN); 