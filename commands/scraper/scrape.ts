import Discord, { Message } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';

// // TODO: Transfer to helper file
// const parsePricing = (content: string): Record<string, number> => {
//     let entries = content.split(', ').map(price => {
//         const [group, value] = price.split('=');
//         if (!group || !value) return null;
//         return [group.trim(), Number(value)];
//         })
//         .filter((entry): entry is [string, number] => entry !== null); // type guard
//     return Object.fromEntries(entries);
// };

// type GroupCode = [string, string];
// let GroupCodeHolder: GroupCode[] = [];
// let prices: Record<string, number> = {};
// let defaultPrice: number = 0;

// client.on('messageUpdate', async (old_message, new_message) => {

//     if (!new_message.channel.messages.cache.last(3)
//         .some(msg => msg.content.toLowerCase().includes("!inv") && (msg.content.toLowerCase().includes("collect=y") || msg.content.toLowerCase().includes("push=y"))))
//         return;

//     let nm = new_message.content || "";
//     if (nm.toLowerCase().includes("push=y")) {

//         if (prices && Object.keys(prices).length > 0) {
//             const sortedPrices = Object.entries(prices)
//             .sort((a, b) => b[1] - a[1]);
//             prices = Object.fromEntries(sortedPrices);

//             let tt = '';
//             GroupCodeHolder.map((tuple, index) => {
//                 const price = Object.keys(prices)
//                     .find(key => tuple[0].includes(key));

//                 const value = price ? prices[price] : defaultPrice;
//                 tt += `!sell ${tuple[1]} ${value}\n`;
//                 if (index % 25 === 0 && index !== 0)
//                     tt += '\n';
//                 if (index === GroupCodeHolder.length - 1)
//                     tt += `\n\nTotal: ${GroupCodeHolder.length} cards\n`;
//             });

//             const fs = require('fs');
//             fs.writeFile('output.txt', tt, (err: any) => {
//                 if (err) throw err;
//                 new_message.channel.send({files: ['output.txt']});
//             });
            
//         } else {
        
//             let tt = '';
//             GroupCodeHolder.map((tuple, index) => {
//                 tt += `${tuple[0]}: ${tuple[1]}\n`
//                 if (index % 25 === 0 && index !== 0)
//                     tt += '\n';
//                 if (index === GroupCodeHolder.length - 1)
//                     tt += `\n\nTotal: ${GroupCodeHolder.length} cards\n`;
//             });

//             const fs = require('fs');
//             fs.writeFile('output.txt', tt, (err: any) => {
//                 if (err) throw err;
//                 new_message.channel.send({files: ['output.txt']});
//             });
//         }

//         GroupCodeHolder = [];

//     } else {
        
//         old_message.embeds[0].fields.forEach(field => {
//             let toPush = [field.name, field.value.split('\n')[0]];
//             if (!GroupCodeHolder.some(tuple => tuple[1].includes(toPush[1]))) {
//                 GroupCodeHolder.push([toPush[0].toLowerCase(), toPush[1]]);
//             }
//         });
//         new_message.embeds[0].fields.forEach(field => {
//             let toPush = [field.name, field.value.split('\n')[0]];
//             if (!GroupCodeHolder.some(tuple => tuple[1].includes(toPush[1]))) {
//                 GroupCodeHolder.push([toPush[0].toLowerCase(), toPush[1]]);
//             }
//         });
        
//         console.log("Logging:", GroupCodeHolder);
//     }

// });

type CardMetadata = {card: string, code: string};
function getCardsFromEmbed (embed: Discord.MessageEmbed): CardMetadata[] {
    const map = new Map<string, CardMetadata>();
    for (const field of embed.fields) {
        const code = field.value.split('\n')[0];
        map.set(code, { card: field.name, code });
    }
    return [...map.values()];
}

function removeDuplicates (cards: CardMetadata[]): CardMetadata[] {
    const seen = new Set<string>();
    return cards.filter(card => {
        if (seen.has(card.code)) return false;
        seen.add(card.code);
        return true;
    });
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
function onCompleteEmbed (message: Message, cards: CardMetadata[]) {
    return {
        author: {
            name: `${message.author.username} — Inventory Scraper`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
        },
        title: `\`🌀\` — Succesfully scraped **${cards.length}** cards.`,
        description: ('```' + cards
            .map(card => card.code)
            .reduce((acc, code, i) => {
                const chunkIndex = Math.floor(i / 25);
                acc[chunkIndex] = (acc[chunkIndex] || []).concat(code);
                return acc;
            }, [] as string[][])
            .map(chunk => chunk.join(' '))
            .join('``````') + '```'),
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
            filter: initialFilter, max: 1, time: 3000,
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
            CardCollection.push(...getCardsFromEmbed(baseMessage.embeds[0]));

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
                    embeds: [onCompleteEmbed(message, CardCollection)],
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
            CardCollection = removeDuplicates([
                ...CardCollection, ...getCardsFromEmbed(newMsg.embeds[0])]);
            transparency.edit({
                embeds: [onFetchEmbed(message, CardCollection.length)],
                allowedMentions: { repliedUser: false }
            });
            
            // If the embed indicates the last page, check if it's the last page
            const match = newMsg.embeds[0]?.footer?.text?.match(/^Page (\d+) of (\d+)/i);
            if (match && match[1] === match[2]) {
                // If it is the last page, stop listening for updates
                transparency.edit({
                    embeds: [onCompleteEmbed(message, CardCollection)],
                    allowedMentions: { repliedUser: false }
                });
                // Clear everything
                CardCollection = [];
            }
        });

        // Send the initial message to indicate processing
        const transparency = await message.reply({
            embeds: [onFetchEmbed(message, CardCollection.length)],
            allowedMentions: { repliedUser: false }
        });
    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['scr', 'collect', 'coll'],

    usage: "Scrapes a user's inventory for cards.",
    categ: (__dirname.split(/[\\/]/).pop()!).toUpperCase(),
    status: 'ACTIVE',
    extend: false
};
