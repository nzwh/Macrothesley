import Discord, { Message } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';

export default {
    run: async (client : SuperClient, message: Message, args: any[]) => {

        const pn_embed = new Discord.EmbedBuilder()
            .setDescription('\`🎮 Pinging...\`')
            .setColor(parseInt(message.guild!.members.me!.displayHexColor.replace('#', ''), 16));

        const msg = await message.reply({ allowedMentions: { repliedUser: false }, 
            embeds: [pn_embed] });
        msg.edit({ allowedMentions: { repliedUser: false }, 
            embeds: [
                pn_embed.setDescription(
                    `\`🎮 Pong!~  ⟶  ◽ Latency: ${Math.floor(msg.createdTimestamp - message.createdTimestamp)}ms\``)
            ]
        });
    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['lat', 'latency'],

    usage: "Fetches the ping between the bot and the server.",
    categ: (__dirname.split(/[\\/]/).pop()!).toUpperCase(),
    status: 'ACTIVE',
    extend: false
};
