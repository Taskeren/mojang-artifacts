# Mojang Artifacts

Mojang maintained their own Maven repository in a very weird way, where they just upload the content, while not updating
the metadata.

This script is used to generate an external manifest of what their Maven probably providing, from the manifests of
Minecraft game.

```kts
repositories {
    // ...
    maven {
        url = uri("https://libraries.minecraft.net")
    }
}
```
