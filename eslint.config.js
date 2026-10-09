import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ignores:['dist/**','node_modules/**','.runtime/**']},js.configs.recommended,...ts.configs.recommended,{files:['**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}},{files:['**/*.js'],languageOptions:{globals:{console:'readonly'}}});
