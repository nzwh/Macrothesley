import Discord, { Message, EmbedBuilder, TextChannel } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';

import { CardMetadata } from '../../types/GlobalTypes';
import { 
    isPageEnd,
    isCountEqual,
    getUniqueCards,
    getCards,
    setCards,
    getPricing,
    setPricing,
    getEvents,
    setEvents,
    handleFormatting,
    createTemplate,
    onFetchEmbed,
    onCompleteEmbed,
    handleTextLimit
} from '../../functions/ScraperFunctions';

// function that takes some arguments: display author? display footer? and then accepts an existing embed
function createEmbedTemplate(message: Message, name: string) {

    const BOT_HEX = message.guild?.members.me?.displayHexColor;
    const BOT_COLOR = BOT_HEX ? parseInt(BOT_HEX.slice(1), 16) : 0x2F3136;

    const embed = new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setAuthor({
            name: `${message.author.username} — ${name}`,
            iconURL: message.author.displayAvatarURL(),
        })
        .setFooter({
            text: "Macrothesley",
            iconURL: message.client.user.displayAvatarURL()
        })
        .setTimestamp(new Date());
    
    return {
        embeds: [embed],
        allowedMentions: { repliedUser: false }
    };
}

export default {
    run: async (client : SuperClient, message: Message, args: any[]) => {

        // Initialize the card structure and constants
        const BOT_ID = '730104910502297670'
        let CardCollection: CardMetadata[] = [];

        // Filter only for the bot's response with an embed
        const initialFilter = (m: Message) =>
            m.author.id === BOT_ID &&
            m.embeds.length > 0 
        // Find the first message in the channel that matches the filter
        const initialMessage = await (message.channel as TextChannel).awaitMessages({
            filter: initialFilter, max: 1, time: 10000,
        });
        // Set the first message as the base message
        const baseMessage = initialMessage.first();

        // If no embed was found, end early, and inform the user
        if (!baseMessage || baseMessage.embeds[0].fields.length === 0) {
            const template = createEmbedTemplate(message, 'Inventory Scraper');
            template.embeds[0]
                .setTitle("\`🌀\` — No cards found in your inventory.")
            return message.reply(template as Discord.MessageReplyOptions);
        }
                    
        // Extract cards from the initial embed
        if (baseMessage.embeds[0])
            CardCollection.push(...getCards(baseMessage.embeds[0]));

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
                const { embed, file } = handleTextLimit(message, CardCollection, args);
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
            CardCollection = getUniqueCards([
                ...CardCollection, ...getCards(newMsg.embeds[0])]);
            transparency.edit({
                embeds: [onFetchEmbed(message, CardCollection.length)],
                allowedMentions: { repliedUser: false }
            });
            
            // Check for length and discrepancies in the new embed
            // If the embed indicates the last page, check if it's the last page
            const discrepancy = isCountEqual(newMsg, CardCollection.length);
            if (discrepancy || (isPageEnd(newMsg) && discrepancy)) {
                // Generate the final embed
                const { embed, file } = handleTextLimit(message, CardCollection, args);
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
        const discrepancy = isCountEqual(baseMessage, CardCollection.length);
        // Send the initial message to indicate processing
        const transparency = await message.reply({
            embeds: [(discrepancy || (isPageEnd(baseMessage) && discrepancy)) ?
                onCompleteEmbed(message, CardCollection) : 
                onFetchEmbed(message, CardCollection.length)],
            allowedMentions: { repliedUser: false }
        });
        // If the embed indicates the last page, clear the card collection
        if (discrepancy || (isPageEnd(baseMessage) && discrepancy))
            CardCollection = [];
    
    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['scr', 'collect', 'coll'],

    usage: "Scrapes a user's inventory for cards.",
    categ: (__dirname.split(/[\\/]/).pop()!).toUpperCase(),
    status: 'ACTIVE',
    extend: false
};
