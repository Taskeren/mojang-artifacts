import {Hono} from "hono";
// @ts-ignore
import data from "../../result.json?raw"

const app = new Hono<{ Bindings: CloudflareBindings }>();

type MojArtifactData = { [key: string]: string[] };

app.get("/", (c) => {
    let va = Object.keys(data)
        .filter(it => !it.includes("@"))
        .map(it => [it, it.split(/[.:]+/)] satisfies [string, string[]])
        .map(([value, path]) => `<a href="${path.join("/")}/maven-metadata.xml">${value}</a>`)
        .join("<br/>\n")

    let html = `<html lang="en">
<body>
    <ol>
{list}
    </ol>
</body>
</html>`.replace("{list}", va);
    return c.html(html);
})

app.get("/:path{.+/maven-metadata\\.xml}", async (c) => {
    let url = new URL(c.req.url);
    let pathname = url.pathname;
    let parts = pathname
        // trim the leading slash and the filename
        .substring(1, pathname.length - "/maven-metadata.xml".length).split("/");

    let repo: MojArtifactData = data
    // the modules
    let modules = Object.keys(repo)
        .filter(it => !it.includes("@")) // classifiers not supported yet

    let module = concatToModule(parts);
    if (modules.includes(module)) {
        c.header("Content-Type", "application/xml")
        return c.body(generateMetadata(module, repo[module]));
    }

    return c.json({message: "Module not found!"}, 404);
});

app.get("/:paths{.+}", async (c) => {
    let url = new URL(c.req.url);
    return c.redirect("https://libraries.minecraft.net" + url.pathname);
})

/**
 * Concat the given array to a maven module notation. (e.g., foo.bar:baz)
 */
function concatToModule(ss: string[]): string {
    let s = "";
    for (let i = 0; i < ss.length - 1; i++) {
        s += ss[i];
        if (i != ss.length - 2) s += ".";
    }
    s += ":";
    s += ss[ss.length - 1];
    return s;
}

function generateMetadata(module: string, versions: string[]): string {
    let [group, artifact] = module.split(":");
    let latest = versions[versions.length - 1];
    let versionsXml = versions.map(v => `<version>${v}</version>`).join("\n");
    let lastUpdated = new Date().getTime().toString();
    return `<metadata>
    <groupId>{group}</groupId>
    <artifactId>{artifact}</artifactId>
    <versioning>
        <latest>{latest}</latest>
        <release>{latest}</release>
        <versions>
{versions}
        </versions>
        <lastUpdated>{lastUpdated}</lastUpdated>
    </versioning>
</metadata>`
        .replace("{group}", group)
        .replace("{artifact}", artifact)
        .replaceAll("{latest}", latest)
        .replace("{versions}", versionsXml)
        .replace("{lastUpdated}", lastUpdated);
}

export default app;
