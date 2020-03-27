const common = require("./common");
const fs = require("fs");
const path = require("path");

const files = [
    "./src/app/types/item.ts",
    "./src/app/types/deep-zoom-item.ts",
    "./src/app/types/block-list-item.ts",
    "./src/app/types/page-item.ts",
    "./src/app/types/slideshow-item.ts",
    "./src/app/types/three-viewer-item.ts"
];


const types = [
    { name: "Item", dest: "./src/app/types/schema.json" }
]

common.generateJsonSchema(files, types.map(t => t.name), r => {
    for (let typeName in r) {
        let p = path.resolve(types.find(t => t.name === typeName).dest);
        fs.writeFileSync(p, JSON.stringify(r[typeName]));
        console.log(`Build json schema: ${p}`)
    }
});