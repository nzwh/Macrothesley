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

type EmployeeCompensation = { id: string, count: number, salary: number }
type EmployeeData = { discordId: string, diligence: number, history: number }

export type {
    CardMetadata, Query, Command, EmployeeCompensation, EmployeeData
};