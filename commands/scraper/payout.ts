import { EmbedBuilder, Message, TextChannel } from 'discord.js';
import SuperClient from '../../extensions/SuperClient';
import fs from 'fs/promises';

interface EmployeeCompensation { id: string, count: number, salary: number }
interface EmployeeData { discordId: string, diligence: number, history: number }

function getSalary (count: number): number {
    return Math.round((
        42 + Math.sqrt((count <= 80) ? count : (80 + (count - 80) / 100))
      ) * count / 10) * 10;
}

function parseData (file: string): EmployeeCompensation[] {
    const data = JSON.parse(file).data?.company?.employees;
    return data
        .map((employee: EmployeeData) => ({
            id: employee.discordId,
            count: employee.history,
            salary: getSalary(employee.history)
        }))
        .sort((a: EmployeeCompensation, b: EmployeeCompensation) => 
            b.count - a.count
        )
        .filter((employee: EmployeeCompensation) =>
            employee.count >= 20
        );
}

function addCommas (num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default {
    run: async (client: SuperClient, message: Message, args?: string[]) => {
        
        const file = await fs.readFile('database/062125.json', 'utf-8');
        const payout = parseData(file);

        const PayoutTable = payout.map((employee: EmployeeCompensation) =>
            `> - \`${employee.id.padEnd(19, ' ')}\` [\`x${employee.count.toString().padEnd(3, ' ')}\`](https://.)   ⟶   \`㊥\` \`${addCommas(employee.salary)}\``
        ).join('\n');
        const PayoutCommands = payout.map((employee: EmployeeCompensation) =>
            `> - !bal give <@${employee.id}> ${employee.salary} 🌀`
        ).join('\n');

        const totalPayout = payout.reduce((acc, emp) => acc + emp.salary, 0);
        const totalIncome = args?.[0] ? Number(args[0]) : 0;

        const BOT_HEX = message.guild?.members.me?.displayHexColor;
        const BOT_COLOR = BOT_HEX ? parseInt(BOT_HEX.slice(1), 16) : 0x2F3136;
    
        const TableEmbed = new EmbedBuilder()
            .setColor(BOT_COLOR)
            .setAuthor({
                name: `${message.author.username} — ${"Meropide+ Payout Scraper"}`,
                iconURL: message.author.displayAvatarURL(),
            })
            .setFooter({
                text: "Macrothesley",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTimestamp(new Date())
            .setDescription(
                `\`🌀\` **Top worker:** <@${payout[0].id}> with [\`x${payout[0].count}\`](https://.) works.` +
                `\n\n${PayoutTable}\n\n` +
                `\`🌀\` **Payout:** \`${addCommas(totalPayout)}\` ` + 
                `\`/\` **Income:** \`${addCommas(totalIncome)}\` ` +
                `\`/\` **Debt:** \`${addCommas(totalPayout - totalIncome)}\``
            );
        
        const CommandsEmbed = new EmbedBuilder()
            .setColor(BOT_COLOR)
            .setAuthor({
                name: `${message.author.username} — ${"Meropide+ Payout Commands"}`,
                iconURL: message.author.displayAvatarURL(),
            })
            .setFooter({
                text: "Macrothesley",
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTimestamp(new Date())
            .setDescription(`${PayoutCommands}`);

        await (message.channel as TextChannel).send({
            allowedMentions: { repliedUser: false },
            embeds: [TableEmbed]
        });
        await (client.channels.cache.get('1385978673521496205') as TextChannel).send({
            allowedMentions: { repliedUser: false },
            embeds: [CommandsEmbed]
        });
        if (message.deletable) await message.delete();
        return;
    },

    name:  __filename.substring(__dirname.length + 1).split(".")[0],
    alias: ['pyt'],

    usage: "Fetches the ping between the bot and the server.",
    categ: (__dirname.split(/[\\/]/).pop() || 'default').toUpperCase(),
    status: 'ACTIVE',
    extend: false
};
