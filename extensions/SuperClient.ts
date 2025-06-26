import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { Command } from '../types/GlobalTypes';

class SuperClient extends Client {

    public commands: Collection<string, Command>;
    public aliases: Collection<string, string>;
    public categories: Array<string>;
    public color: number;

    constructor(){
        super({ intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildVoiceStates
        ], partials: [
            Partials.Channel,
            Partials.Message,
            Partials.Reaction,
            Partials.User
        ]});
        this.commands = new Collection();
        this.aliases = new Collection();
        this.categories = [];
        this.color = 0xFFF;
    }

}

export default SuperClient;
