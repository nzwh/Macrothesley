import { AttachmentBuilder, Embed, EmbedBuilder, Message, MessageCreateOptions } from 'discord.js';
import { CardMetadata, Query } from '../types/GlobalTypes';

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
function setCards (cards: CardMetadata[], chunkSize: number, full?: boolean): string {

    const text = cards
        .map(card => card.code)
        .reduce((acc, code, i) => {
            const chunkIndex = Math.floor(i / chunkSize);
            acc[chunkIndex] = (acc[chunkIndex] || []).concat(code);
            return acc;
        }, [] as string[][])
        .map(chunk => chunk.join(' '))

    return full ? text.join(' ') : text.join('``````') ;

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
function handleFormatting (cards: CardMetadata[], template: MessageCreateOptions, args?: Query[]): MessageCreateOptions {

    let formattedString = setCards(cards, 25);
    for (const arg of args || []) {
        if (arg.key === 'events') 
            formattedString = setEvents(cards, getEvents(arg.value));
        if (arg.key === 'pricing') 
            formattedString = setPricing(cards, getPricing(arg.value));
        if (arg.key === 'full')
            formattedString = setCards(cards, 25, true);
    }

    if (args?.some(arg => arg.key === 'mobile')) {
        (template.embeds?.[0] as EmbedBuilder)
            .addFields(formattedString
                .split('``````')
                .map((chunk, i) => ({
                    name: `\`➖\` \`Chunk\` \`#${i + 1}\``,
                    value: chunk || '\u200b'
                })))
            .setDescription(
                '-# `🥽` — Tip: Copy a chunk by long-pressing a chunk and tapping `Copy`.'
            )
    } else {
        (template.embeds?.[0] as EmbedBuilder)
            .setDescription(formattedString.length <= 4000 ?
                (`\`\`\`${formattedString}\`\`\`\n` +
                '-# `🥽` — Tip: Copy a block using the button on the upper right of a block.') :
                ('Exceeded text limit.')
            )
    }

    return template;
}



//-- (->MessageCreateOptions) Creates a template for the message
function createTemplate(message: Message, name: string): MessageCreateOptions {

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
    } as MessageCreateOptions;
}

//-- (->MessageCreateOptions) Creates a message for card fetching
function onFetchEmbed (message: Message, length: number): MessageCreateOptions {

    const template = createTemplate(message, 'Inventory Scraper');
    (template.embeds?.[0] as EmbedBuilder)
        .setTitle(`\`🌀\` — Scraping (**${length}**/?) cards...`)
        .setDescription(
            '-# Tip: Cycle through your entire inventory to get all the cards.\n' +
            '-# You can stop this by editing the command to add `push=y`.'
        );

    return template;
}
//-- (->MessageCreateOptions) Creates a message when fetching is complete
function onCompleteEmbed (message: Message, cards: CardMetadata[], args?: Query[]): MessageCreateOptions {

    const template = createTemplate(message, 'Inventory Scraper');
    (template.embeds?.[0] as EmbedBuilder)
        .setTitle(`\`🌀\` — Successfully scraped **${cards.length}** cards.`)
        
    return handleFormatting(cards, template, args);
}

//-- (->{embed, file}) Handles the files if the text limit is exceeded
function handleTextLimit (message: Message, cards: CardMetadata[], args?: Query[]) {

    const embed = onCompleteEmbed(message, cards, args).embeds?.[0] as EmbedBuilder;
    const description = embed.data.description || '';
    if (description !== "Exceeded text limit.")
        return { embeds: [embed] };

    const content = setCards(cards, 25, false).replace(/``````/g, '\n\n');
    const buffer = Buffer.from(content, 'utf-8');
    const file = new AttachmentBuilder(buffer, { name: 'cards.txt' });

    embed.data.description = '';
    return { embeds: [embed], ...(file && { files: [file] }) }
}

export {
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
