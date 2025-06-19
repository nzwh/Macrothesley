import { Message } from 'discord.js';
import SuperClient from '../extensions/SuperClient';

type CardMetadata = { card: string, code: string };
type Query = { key: string, value: string };

interface Command {
    run: (
        client: SuperClient, 
        message: Message, 
        args: string[] | Query[]
    ) => Promise<void>;

    name: string;
    alias: string[];
    usage?: string;
    categ?: string;
    status?: string;
    extend?: boolean;
}

export type {
    CardMetadata, Query, Command
};