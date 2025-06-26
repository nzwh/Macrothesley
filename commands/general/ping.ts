import SuperClient from '../../extensions/SuperClient';
import { Command } from '../../types/GlobalTypes';
import { EmbedBuilder, Message } from 'discord.js';

export default {
    run: async (client: SuperClient, message: Message, args?: string[]) => {

        const BOT_HEX = message.guild?.members.me?.displayHexColor;
        const BOT_COLOR = BOT_HEX ? parseInt(BOT_HEX.slice(1), 16) : 0x2F3136;

        const pn_embed = new EmbedBuilder()
            .setDescription('`🎮 Pinging...`')
            .setColor(BOT_COLOR);

        const msg = await message.reply({ 
            allowedMentions: { repliedUser: false },
            embeds: [pn_embed] 
        });

        msg.edit({ 
            allowedMentions: { repliedUser: false }, 
            embeds: [pn_embed
                .setDescription(`\`🎮 Pong!~  ⟶  ◽ Latency: ${Math.floor(msg.createdTimestamp - message.createdTimestamp)}ms\``)
            ]
        });

        return;
    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['lat', 'latency'],

    usage: "Fetches the ping between the bot and the server.",
    categ: (__dirname.split(/[\\/]/).pop() || 'default').toUpperCase(),
    status: 'ACTIVE',
    extend: false

} as Command;
