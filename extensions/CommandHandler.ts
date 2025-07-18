import fs, { Dirent } from 'fs';
import SuperClient from './SuperClient';
import { Command } from '../types/GlobalTypes';

/*  Function: GetFiles
    Parses all files within the directory folder into a 
    command collection in "client.commands".
    * @param: dir : string           -> The directory path
    * @param: suffix : string         -> The filetype to look for
    * @param: client : SuperClient    -> To store the commands 
*/
const GetFiles = (dir: string, suffix: string, client: SuperClient) => {

    const master : Dirent[] = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of master) {

        if (file.isDirectory()) {
            const name = file.name.charAt(0).toUpperCase() + file.name.slice(1);

            if (fs.readdirSync(`${dir}/${file.name}`).filter(f => f.endsWith('.js') || f.endsWith('.ts')).length === 0) {
                console.log(`  ❱❱ No commands in the ${name} folder to load.`);
            } else {
                console.log(`  ❱❱ Loading files from the ${name} folder...`);
                client.categories.push(name);
                GetFiles(`${dir}/${file.name}`, suffix, client);
            }

        } else if (file.name.endsWith(suffix)) {
            let command = require(`../${dir}/${file.name}`).default as Command;
            const command_name = file.name.substring(0, file.name.indexOf('.'));

            if (client.commands.has(command_name)) {
                console.log(`     [!] The command "${command_name}" has already been loaded.`);
            } else {
                client.commands.set(command_name, command);
            }

            if (!command.alias) continue;
            for (const alias of command.alias) {
                if (client.aliases.has(alias)) {
                    console.log(`     [!] The alias "${alias}" of "${command_name}" has already been loaded.`);
                } else {
                    client.aliases.set(alias, command_name);
                }
            }
        }
    }
};

export default (client: SuperClient) => {
    GetFiles('commands', '.ts', client);
};