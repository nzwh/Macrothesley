import Discord, { Message } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';

import { CardMetadata } from '../../functions/f_scraper';
import { 
    getMatchAndDiscrepancy, 
    handleCardExtraction, 
    handleCardDeduplication, 
    handleCompleteEmbed, 
    handleFormatting, 
    onCompleteEmbed, 
    onFetchEmbed 
} from '../../functions/f_scraper';

export default {
    run: async (client : SuperClient, message: Message, args: any[]) => {

        // Initialize the card collection and bot ID
        const BOT_ID = '730104910502297670'
        const channel = message.channel as Discord.TextChannel;
        let CardCollection: CardMetadata[] = [];

        // Filter for the bot's response with an embed
        const initialFilter = (m: Message) =>
            m.author.id === BOT_ID &&
            m.embeds.length > 0 
        const embedMessage = await channel.awaitMessages({
            filter: initialFilter, max: 1, time: 10000,
        });
        // Set the first message as the base message
        const baseMessage = embedMessage.first();

        // If no embed was found, end early
        if (!baseMessage || baseMessage.embeds[0].fields.length === 0) 
            return message.reply({
                embeds: [{
                    author: {
                        name: `${message.author.username} — Inventory Scraper`,
                        icon_url: message.author.displayAvatarURL(),
                    },
                    title: "\`🌀\` — No cards found in your inventory."
                }], 
                allowedMentions: { repliedUser: false }
            });
        // Extract cards from the initial embed
        if (baseMessage.embeds[0])
            CardCollection.push(...handleCardExtraction(baseMessage.embeds[0]));

        // Filter for updates to the bot's response
        const filter = (m: Message) => 
            m.id === baseMessage.id &&
            m.author.id === BOT_ID &&
            m.embeds.length > 0 
        client.on('messageUpdate', async (oldMsg, newMsg) => {

            // If the message is partial, fetch it
            if (newMsg.partial) 
                newMsg = await newMsg.fetch();

            // If the message from the user says push=y, stop listening for updates
            if (newMsg.content.toLowerCase().includes('push=y')) {
                // Generate the final embed
                const { embed, file } = handleCompleteEmbed(message, CardCollection, args);
                // If it is the last page, stop listening for updates
                transparency.edit({
                    embeds: [embed],
                    allowedMentions: { repliedUser: false },
                    ...(file && { files: [file] })
                });
                // Clear everything
                CardCollection = [];
                return;
            }

            // If the message doesn't match the filter, ignore it
            if (!filter(newMsg)) return;
            // If the embed has no fields, ignore it
            if (newMsg.embeds.length <= 0) return;

            // Update the card collection with new cards, and update the message
            CardCollection = handleCardDeduplication([
                ...CardCollection, ...handleCardExtraction(newMsg.embeds[0])]);
            transparency.edit({
                embeds: [onFetchEmbed(message, CardCollection.length)],
                allowedMentions: { repliedUser: false }
            });
            
            // Check for length and discrepancies in the new embed
            const { match, discrepancy } = getMatchAndDiscrepancy(newMsg, CardCollection.length);
            // If the embed indicates the last page, check if it's the last page
            if (discrepancy || (match && match[1] === match[2] && discrepancy)) {
                // Generate the final embed
                const { embed, file } = handleCompleteEmbed(message, CardCollection, args);
                // If it is the last page, stop listening for updates
                transparency.edit({
                    embeds: [embed],
                    allowedMentions: { repliedUser: false },
                    ...(file && { files: [file] })
                });
                // Clear everything
                CardCollection = [];
            }
        });

        // Check for length and discrepancies in the initial embed
        const { match, discrepancy } = getMatchAndDiscrepancy(baseMessage, CardCollection.length);
        // Send the initial message to indicate processing
        const transparency = await message.reply({
            embeds: [(discrepancy || (match && match[1] === match[2] && discrepancy)) ?
                onCompleteEmbed(message, CardCollection) : 
                onFetchEmbed(message, CardCollection.length)],
            allowedMentions: { repliedUser: false }
        });
        // If the embed indicates the last page, clear the card collection
        if ((discrepancy || match && match[1] === match[2] && discrepancy))
            CardCollection = [];
    
    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['scr', 'collect', 'coll'],

    usage: "Scrapes a user's inventory for cards.",
    categ: (__dirname.split(/[\\/]/).pop()!).toUpperCase(),
    status: 'ACTIVE',
    extend: false
};
