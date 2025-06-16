import Discord, { Message } from 'discord.js';
import { CardMetadata } from '../types/GlobalTypes';

function getMatchAndDiscrepancy (message: Message, length: number) {
    const match = message.embeds[0]?.footer?.text?.match(/^Page (\d+) of (\d+)/i);
    const discrepancy = length === 
        Number(message.embeds[0].description?.split('has ')[1].split(' cards')[0]);
    return { match, discrepancy };
}

function handleCardExtraction (embed: Discord.Embed): CardMetadata[] {
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
        .sort((a, b) => b.localeCompare(a))
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
            iconURL: message.author.displayAvatarURL(),
        },
        title: `\`🌀\` — Scraping (**${length}**/?) cards...`,
        description: 
            '-# Tip: Cycle through your entire inventory to get all the cards.\n' +
            '-# You can stop this by editing the command to add `push=y`.',
        footer: { text: `Macrothesley` },
        timestamp: new Date().toISOString(),
        color: parseInt(message.guild!.members.me!.displayHexColor.replace('#', ''), 16)
    };
}
function onCompleteEmbed (message: Message, cards: CardMetadata[], args?: any[]) {
    return {
        author: {
            name: `${message.author.username} — Inventory Scraper`,
            iconURL: message.author.displayAvatarURL(),
        },
        title: `\`🌀\` — Succesfully scraped **${cards.length}** cards.`,
        description: ('```' + handleFormatting(cards, args) + '```'),
        footer: { 
            text: `Macrothesley`, 
            iconURL: message.client.user!.displayAvatarURL() 
        },
        timestamp: new Date().toISOString(),
        color: parseInt(message.guild!.members.me!.displayHexColor.replace('#', ''), 16)
    }
}

function handleCompleteEmbed(message: Message, cards: CardMetadata[], args?: any[]) {
    const embed = onCompleteEmbed(message, cards, args);
    if (embed.description.length <= 4000) {
        return { embed, file: null };
    }

    const content = embed.description.slice(3, -3).replace(/``````/g, '\n\n');
    const buffer = Buffer.from(content, 'utf-8');
    const file = new Discord.AttachmentBuilder(buffer, { name: 'cards.txt' });

    embed.description = '';
    return { embed, file };
}

export {
    getMatchAndDiscrepancy,
    handleCardExtraction,
    handleCardDeduplication,
    handleFormatting,
    handlePricing,
    onFetchEmbed,
    onCompleteEmbed,
    handleCompleteEmbed
};

export type { CardMetadata };