const tjs = require("typescript-json-schema");
const path = require("path");
const nw = require("node-watch");
const fs = require("fs");


const settings = {
    required: true,
    noExtraProps: true
}

const generateJsonSchema = function (files, types, watchCallback) {

    files = files.map(f => path.resolve(f));


    const getSchemas = function () {
        const program = tjs.getProgramFromFiles(files);
        const generator = tjs.buildGenerator(program, settings);
        
        let result = {};
        for (let t of types) {
            result[t] = generator.getSchemaForSymbol(t);
        }
        return result;
    }


    if (watchCallback) {
        watchCallback(getSchemas());
        for (let f of files)
            nw(f, (evt, filename) => { watchCallback(getSchemas()) });
    } else {
        return getSchemas();
    }


}


const generateJsonTemplate = function (rootDir, watchCallback) {

    const getTemplates = function () {
        let toExplore = [path.resolve(rootDir)];

        let result = [];

        while (toExplore.length > 0) {

            let current = toExplore.shift();

            for (let f of fs.readdirSync(current)) {
                let p = path.resolve(p);
                let stats = fs.statSync(p);

                if (stats.isFile() && p.match(/^.+\.html$/)) {
                    let tmplName = path.basename(p, ".html");
                    let tmplContents = fs.readFileSync(p, { encoding: "utf-8" });
                    result.push({
                        name: tmplName,
                        contents: tmplContents
                    })
                } else if (stats.isDirectory()) {
                    toExplore.push(p);
                }

            }
        }

        return result;

    }

    if (watchCallback) {
        watchCallback(getTemplates());
        nq(path.resolve(rootDir), { recursive: true }, (evt, filename) => watchCallback(getTemplates()));
    } else {
        return getTemplates();
    }

}

module.exports = {
    generateJsonSchema: generateJsonSchema,
    generateJsonTemplate: generateJsonTemplate
}