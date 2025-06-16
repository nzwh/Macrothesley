import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';

class SuperClient extends Client {

    public commands: Collection<unknown, any>;
    public aliases: Collection<unknown, any>;
    public categories: Array<string>;

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
    }

}

export default SuperClient;
