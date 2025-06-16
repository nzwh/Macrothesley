import Discord, { Message, Embed, EmbedBuilder, MessagePayload, MessageReplyOptions } from 'discord.js';
import { CardMetadata } from '../types/GlobalTypes';

//-- (->boolean) Checks if the current page is the last page
function isPageEnd(message: Message): boolean {
    const match = message.embeds[0]?.footer?.text?.match(/^Page (\d+) of (\d+)/i);
    return match ? match[1] === match[2] : false;
}
//-- (->boolean) Checks if the total card count matches the expected count
function isCountEqual (message: Message, length: number): boolean {
    return (length === Number(message.embeds[0].description?.match(/has (\d+) cards/)?.[1] || 0));
}



//-- (->CardMetadata[]) Returns and removes duplicates from an array of cards
function getUniqueCards (cards: CardMetadata[]): CardMetadata[] {

    const seen = new Set<string>();
    const result = cards.filter(card => {
        if (seen.has(card.code)) return false;
        seen.add(card.code);
        return true;
    });

    return result;
}

//-- (->CardMetdata[]) Returns and formats cards from a given embed
function getCards (embed: Embed): CardMetadata[] {

    const map = new Map<string, CardMetadata>();
    for (const field of embed.fields) {
        const code = field.value.split('\n')[0];
        map.set(code, { card: field.name, code });
    }
    return [...map.values()];
}
//-- (->string) Returns a formatted string with the default settings
function setCards (cards: CardMetadata[], chunkSize: number): string {

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

//-- (->Record<string, number>) Extracts the pricing information from a string
function getPricing (query: string): Record<string, number> {

    const pricing = query
        .slice(1, -1)
        .split(',')
        .sort((a, b) => b.localeCompare(a))
        .map(part => {
            const [group, value] = part.split('=').map(s => s.trim());
            return group && !isNaN(Number(value)) ? [group, Number(value)] : null;
        })
        .filter((entry): entry is [string, number] => entry !== null)
    return Object.fromEntries(pricing);
}
//-- (->string) Returns a formatted string based on pricing if it is set
function setPricing (cards: CardMetadata[], pricing: Record<string, number>): string {

    return cards
        .map(card => {
            const key = Object.keys(pricing)
                .find(k => card.card.toLowerCase().includes(k)) || 'default';
            return `!sell ${card.code} ${pricing[key] ?? 0}`;
        }, [])
        .join('\n');
}

// TODO: (->string[]) Returns a list of events based on a query
function getEvents (query: string): string[] {
    return [];
}
// TODO: (->string) Returns a formatted string based on events if it is set
function setEvents (cards: CardMetadata[], events: string[]): string {
    return "";
}



//-- (->string) Returns a formatted string based on arguments
function handleFormatting (cards: CardMetadata[], args?: any[]): string {

    for (const arg of args || []) {
        if (arg.key === 'events') 
            return setEvents(cards, getEvents(arg.value));
        if (arg.key === 'pricing') 
            return setPricing(cards, getPricing(arg.value));
    }
    return setCards(cards, 25);
}



//-- (->any) Creates a template for the message
function createTemplate(message: Message, name: string) {

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

//-- (->any) Creates a message for card fetching
function onFetchEmbed (message: Message, length: number): any {

    const template = createTemplate(message, 'Inventory Scraper');
    template.embeds[0]
        .setTitle(`\`🌀\` — Scraping (**${length}**/?) cards...`)
        .setDescription(
            '-# Tip: Cycle through your entire inventory to get all the cards.\n' +
            '-# You can stop this by editing the command to add `push=y`.'
        );
    return template;
}
//-- (->any) Creates a message when fetching is complete
function onCompleteEmbed (message: Message, cards: CardMetadata[], args?: any[]) {

    const template = createTemplate(message, 'Inventory Scraper');
    template.embeds[0]
        .setTitle(`\`🌀\` — Successfully scraped **${cards.length}** cards.`)
        .setDescription(
            '-# You may copy each block using the button on the upper right corner.\n' +
            '```' + handleFormatting(cards, args) + '```'
        );
    return template;
}

//-- (->{embed, file}) Handles the files if the text limit is exceeded
function handleTextLimit (message: Message, cards: CardMetadata[], args?: any[]) {

    const embed = onCompleteEmbed(message, cards, args).embeds[0];
    const description = embed.data.description || '';
    if (description.length <= 4000)
        return { embed, file: null };
    
    const content = description.slice(3, -3).replace(/``````/g, '\n\n');
    const buffer = Buffer.from(content, 'utf-8');
    const file = new Discord.AttachmentBuilder(buffer, { name: 'cards.txt' });

    embed.data.description = '';
    return { embed, file };
}

export {
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
}