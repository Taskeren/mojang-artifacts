import asyncio
import json
from collections import defaultdict

import httpx

MINECRAFT_MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"


async def main():
    # [module notation, versions], like ["com.mojang:brigadier", ["1.x.x", "2.x.x"]]
    # module notations maybe end with a classifier: "@classifier"
    result: dict[str, set[str]] = defaultdict(set)
    async with httpx.AsyncClient() as client:
        # see https://minecraft.fandom.com/wiki/Version_manifest.json
        mc_manifest = (await client.get(MINECRAFT_MANIFEST_URL)).json()

        async def handle_version(version):
            # ignore snapshot versions to make the script run faster
            if version["type"] != "release": return
            print(f"Version discovered: {version['id']} ({version['type']})")
            # see https://minecraft.fandom.com/wiki/Client.json
            ver_manifest = (await client.get(version["url"])).json()
            for lib in ver_manifest["libraries"]:
                # group:artifact:version or group:artifact:version:classifier
                artifact = lib["name"].split(":")
                module_notation = f"{artifact[0]}:{artifact[1]}"
                if len(artifact) > 3:  # has classifier
                    module_notation += f"@{artifact[3]}"
                artifact_version = artifact[2]
                # update the result
                result[module_notation].add(artifact_version)

        # handle the versions asynchronously
        tasks = [handle_version(version) for version in mc_manifest["versions"]]
        await asyncio.gather(*tasks)

    # sort the dict for consistency
    result = dict(sorted(result.items()))

    # the dumbass JSON library just can't handle everything.
    # this function casts the objects to what it can handle.
    def json_handler(obj):
        if isinstance(obj, set):
            # sorted, so that the order won't change
            return sorted(list(obj))
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

    result_json = json.dumps(result, indent=4, default=json_handler)
    with open("result.json", "w+") as output:
        output.write(result_json)


if __name__ == "__main__":
    asyncio.run(main())
