import { Message } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';

export default {
    run: async (client : SuperClient, message: Message, args: any[]) => {
        
        const replied_message_id = message.reference?.messageId;
        if (!replied_message_id) return;

        const replied_message = await message.channel.messages.fetch(replied_message_id);
        if (!replied_message) return;

        const replied_embed = replied_message.embeds[0];
        if (!replied_embed) return;

        let tt = '';
        for (const field of replied_embed.fields) 
            tt += field.value.split('\n')[0] + " ";
        message.reply({content: `\`\`\`fix\n${tt}\`\`\`` || "No results found."});

    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['ext', 'ex'],

    usage: "Extracts the codes of a replied embed.",
    categ: (__dirname.split(/[\\/]/).pop()!).toUpperCase(),
    status: 'ACTIVE',
    extend: false
};