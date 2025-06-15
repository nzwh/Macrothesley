import Discord, { Message } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';

type CardMetadata = { card: string, code: string };

function getMatchAndDiscrepancy (message: Message, length: number) {
    const match = message.embeds[0]?.footer?.text?.match(/^Page (\d+) of (\d+)/i);
    const discrepancy = length === 
        Number(message.embeds[0].description?.split('has ')[1].split(' cards')[0]);
    return { match, discrepancy };
}

function handleCardExtraction (embed: Discord.MessageEmbed): CardMetadata[] {
    const map = new Map<string, CardMetadata>();
    for (const field of embed.fields) {
        const code = field.value.split('\n')[0];
        map.set(code, { card: field.name, code });
    }
    return [...map.values()];
}
function handleCardDeduplication (cards: CardMetadata[]): CardMetadata[] {
    const seen = new Set<string>();
    return cards.filter(card => {
        if (seen.has(card.code)) return false;
        seen.add(card.code);
        return true;
    });
}

function handleFormatting (cards: CardMetadata[], args?: any[]): string {
    // If the command has arguments, loop through them
    if (args && args.length > 0 && args.some(arg => arg.key === 'pricing')) {
        // If the pricing argument is provided, parse it
        let pricingArg = args.find(arg => arg.key === 'pricing')?.value.slice(1, -1);
        let priceList = handlePricing(pricingArg);

        // If the pricing argument is provided, format the cards with their prices
        return cards.map(card => {
            const price = priceList[Object.keys(priceList)
                .find(key => card.card.toLowerCase().includes(key)) || 'default' || 0]
            return `!sell ${card.code} ${price}`;
        }).join('\n');
    }

    // If no arguments are provided, return the cards normally
    return cards
        .map(card => card.code)
        .reduce((acc, code, i) => {
            const chunkIndex = Math.floor(i / 25);
            acc[chunkIndex] = (acc[chunkIndex] || []).concat(code);
            return acc;
        }, [] as string[][])
        .map(chunk => chunk.join(' '))
        .join('``````');
}
function handlePricing (content: string): Record<string, number> {
    return Object.fromEntries(
        content.split(',')
        .map(part => {
            const [group, value] = part.split('=').map(s => s.trim());
            return group && !isNaN(Number(value)) ? [group, Number(value)] : null;
        })
        .filter((entry): entry is [string, number] => entry !== null)
    );
}

function onFetchEmbed (message: Message, length: number) {
    return {
        author: {
            name: `${message.author.username} — Inventory Scraper`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
        },
        title: `\`🌀\` — Scraping (**${length}**/?) cards...`,
        description: 
            '-# Tip: Cycle through your entire inventory to get all the cards.\n' +
            '-# You can stop this by editing the command to add `push=y`.',
        footer: { text: `Macrothesley` },
        timestamp: new Date(),
        color: message.guild!.me!.displayHexColor
    };
}
function onCompleteEmbed (message: Message, cards: CardMetadata[], args?: any[]) {
    return {
        author: {
            name: `${message.author.username} — Inventory Scraper`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
        },
        title: `\`🌀\` — Succesfully scraped **${cards.length}** cards.`,
        description: ('```' + handleFormatting(cards, args) + '```'),
        footer: { 
            text: `Macrothesley`, 
            iconURL: message.client.user!.displayAvatarURL({ dynamic: true }) 
        },
        timestamp: new Date(),
        color: message.guild!.me!.displayHexColor
    }
}

export default {
    run: async (client : SuperClient, message: Message, args: any[]) => {

        // Initialize the card collection and bot ID
        const BOT_ID = '730104910502297670'
        let CardCollection: CardMetadata[] = [];

        // Filter for the bot's response with an embed
        const initialFilter = (m: Message) =>
            m.author.id === BOT_ID &&
            m.embeds.length > 0 &&
                typeof m.embeds[0].description === "string" &&
                m.embeds[0].description.includes(message.author.id);
        const embedMessage = await message.channel.awaitMessages({
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
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    },
                    title: `\`🌀\` — No cards found in your inventory.`
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
                // If it is the last page, stop listening for updates
                transparency.edit({
                    embeds: [onCompleteEmbed(message, CardCollection, args)],
                    allowedMentions: { repliedUser: false }
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
                const finalEmbed = onCompleteEmbed(message, CardCollection, args);
                let file = null;

                // If the description is too long, send it as a file
                if (finalEmbed.description.length > 4000) {
                    file = new Discord.MessageAttachment(
                        Buffer.from(finalEmbed.description.slice(3, -3).replace('``````', '\n\n'), 
                            'utf-8'), 'cards.txt'
                    );
                    finalEmbed.description = '';
                }
                // If it is the last page, stop listening for updates
                transparency.edit({
                    embeds: [finalEmbed],
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
