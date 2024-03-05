import {load} from '@loaders.gl/core';
import { Tileset3D } from '@loaders.gl/tiles';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
import { GLTFLoader } from '@loaders.gl/gltf';

const tilesetUrl = 'http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524153/tileset.json';
const tilesetJson = await load(tilesetUrl, Tiles3DLoader);
const tileset3d = new Tileset3D(tilesetJson, {
    throttleRequests: false,
    onTileLoad: tile => console.log(tile)
});

while(!tileset3d.isLoaded()) {
    await tileset3d.selectTiles()
}