import SuperClient from '../../extensions/SuperClient';

import { CardMetadata, Command, Query } from '../../types/GlobalTypes';
import { isCountEqual, getUniqueCards, getCards, onFetchEmbed, onCompleteEmbed, handleTextLimit, createTemplate } from '../../functions/ScraperFunctions';
import { EmbedBuilder, Message, MessageEditOptions, MessageReplyOptions, TextChannel } from 'discord.js';

export default {
    run: async (client : SuperClient, message: Message, args?: Query[]) => {

        // Initialize the card structure and constants
        const BotID = process.env.BOT_ID;
        const CardPool: CardMetadata[] = [];
        // Function to clear the card pool
        function clearContent() {
            CardPool.length = 0;
            return;
        }

        // Filter only for the bot's response with an embed
        const initialFilter = (m: Message) =>
            m.author.id === BotID &&
            m.embeds.length > 0 
        // Find the first message in the channel that matches the filter
        const initialMessage = await (message.channel as TextChannel).awaitMessages({
            filter: initialFilter, max: 1, time: 10000,
        });
        // Set the first message as the base message
        const baseMessage = initialMessage.first();

        // If no embed was found, end early, and inform the user
        if (!baseMessage || baseMessage.embeds[0].fields.length === 0) {
            const template = createTemplate(message, 'Inventory Scraper');
            (template.embeds?.[0] as EmbedBuilder)
                .setTitle("`🌀` — No cards found in your inventory.")
            message.reply(template as MessageReplyOptions);
            return;
        }
                    
        // Extract cards from the initial embed
        if (baseMessage.embeds[0])
            CardPool.push(...getCards(baseMessage.embeds[0]));

        // Send the initial message to indicate processing
        const transparency = await message.reply(
            // Send an embed depending on the card count
            (isCountEqual(baseMessage, CardPool.length)) ?
                onCompleteEmbed(message, CardPool, args) : 
                onFetchEmbed(message, CardPool.length)
        );

        // If the embed indicates the last page, clear the card collection
        if (isCountEqual(baseMessage, CardPool.length)) {
            clearContent();
            return;
        }

        // Filter for updates to the bot's response
        const filter = (m: Message) => 
            m.id === baseMessage.id &&
            m.author.id === BotID &&
            m.embeds.length > 0 
        client.on('messageUpdate', async (oldMsg, newMsg) => {

            // If the message is partial, fetch it
            if (newMsg.partial) 
                newMsg = await newMsg.fetch();

            const messageContent = newMsg.content.toLowerCase();

            // If the message from the user says push=y, stop listening for updates
            if (messageContent.includes('push=y') && message.author.id === newMsg.author.id) {
                transparency.edit(handleTextLimit(message, CardPool, args) as MessageEditOptions);
                clearContent();
                return;
            }

            // If the message doesn't match the filter, ignore it
            if (!filter(newMsg)) return;
            // If the embed has no fields, ignore it
            if (newMsg.embeds.length <= 0) return;

            // Update the card collection with new cards
            const fetchedCards = getUniqueCards([
                ...CardPool, ...getCards(newMsg.embeds[0])]);
            CardPool.length = 0;
            CardPool.push(...fetchedCards);

            // If the card count is equal to the total, edit the message
            if (isCountEqual(newMsg, CardPool.length)) {
                transparency.edit(handleTextLimit(message, CardPool, args) as MessageEditOptions);
                clearContent();
            // If the page is not yet complete, update the embed
            } else {
                transparency.edit(onFetchEmbed(message, CardPool.length) as MessageEditOptions);
            }
        });

        return;
    },
    
    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['scr', 'collect', 'coll'],

    usage: "Scrapes a user's inventory for cards.",
    categ: (__dirname.split(/[\\/]/).pop() || 'default').toUpperCase(),
    status: 'ACTIVE',
    extend: false

} as Command;
