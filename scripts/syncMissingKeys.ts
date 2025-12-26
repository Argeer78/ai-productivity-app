
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---
const PROJECT_ROOT = path.join(__dirname, '..');
const SEARCH_DIRS = ['app', 'components', 'lib', 'utils']; // Adjust as needed
const IGNORE_DIRS = ['node_modules', '.next', '.git'];
const TS_EXTENSIONS = ['.ts', '.tsx'];

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Store found keys: Map<key, text>
// Using a Map ensures we only keep one version. 
// If multiple files define the same key, the last one visited "wins".
const foundTranslations = new Map<string, string>();

/**
 * Recursively walk directory to find .ts/.tsx files
 */
function getFiles(dir: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);

    for (const file of list) {
        if (IGNORE_DIRS.includes(file)) continue;

        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            if (TS_EXTENSIONS.includes(path.extname(file))) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

/**
 * Use TypeScript AST to find t('key', 'default text') calls
 */
function extractFromAst(filePath: string) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
        filePath,
        code,
        ts.ScriptTarget.Latest,
        true
    );

    function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
            // Check if function name is 't'
            if (ts.isIdentifier(node.expression) && node.expression.text === 't') {
                const args = node.arguments;
                if (args.length > 0) {
                    // 1st arg: key (must be string literal)
                    const arg0 = args[0];
                    if (ts.isStringLiteral(arg0)) {
                        const key = arg0.text;
                        let text = key; // Default fallback

                        // 2nd arg: default text (optional, must be string literal)
                        if (args.length > 1) {
                            const arg1 = args[1];
                            if (ts.isStringLiteral(arg1)) {
                                text = arg1.text;
                            }
                        }

                        // Save to map
                        foundTranslations.set(key, text);
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
}

async function run() {
    console.log('🔍 Scanning for translation keys using AST...');

    // 1. Collect Valid Files
    let files: string[] = [];
    for (const dir of SEARCH_DIRS) {
        const fullPath = path.join(PROJECT_ROOT, dir);
        files = files.concat(getFiles(fullPath));
    }

    console.log(`Found ${files.length} TypeScript files to scan.`);

    // 2. Parse Each File
    let fileCount = 0;
    for (const file of files) {
        extractFromAst(file);
        fileCount++;
        if (fileCount % 50 === 0) process.stdout.write('.');
    }
    console.log('\nScanning complete.');
    console.log(`Found ${foundTranslations.size} unique keys.`);

    if (foundTranslations.size === 0) {
        console.log('No keys found. Exiting.');
        return;
    }

    // 3. Prepare Ops
    const upserts: any[] = [];
    for (const [key, text] of foundTranslations) {
        upserts.push({
            key,
            language_code: 'en',
            text, // Update the English text with what is in the code
            updated_at: new Date().toISOString(),
        });
    }

    console.log('📝 Syncing to Supabase (upserting English)...');

    // 4. Batch Upsert
    const BATCH_SIZE = 50;
    let insertedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
        const batch = upserts.slice(i, i + BATCH_SIZE);

        // UPSERT with onConflict match on (key, language_code)
        // This will UPDATE the 'text' field if the key exists.
        const { error } = await supabase
            .from('ui_translations')
            .upsert(batch, { onConflict: 'key, language_code' });

        if (error) {
            console.error('Error upserting batch:', error);
            fs.writeFileSync('scripts/sync_error.txt', JSON.stringify(error, null, 2));
            errorCount += batch.length;
        } else {
            insertedCount += batch.length;
        }
    }

    console.log(`✅ Sync complete.`);
    console.log(`   - Upserted/Updated: ${insertedCount}`);
    console.log(`   - Failed: ${errorCount}`);
}

run().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
