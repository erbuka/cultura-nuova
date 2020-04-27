import { Component, OnInit, Inject } from '@angular/core';
import { ThreeViewerModel, loadTexture, createStandardMaterial } from '../three-viewer';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MeshStandardMaterial } from 'three';
import { ContextService } from 'src/app/context.service';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';


type TextureMap = "map" | "normalMap";

export type MaterialEditorData = {
  model: ThreeViewerModel
}

@Component({
  selector: 'app-material-editor',
  templateUrl: './material-editor.component.html',
  styleUrls: ['./material-editor.component.scss']
})
export class MaterialEditorComponent implements OnInit {

  selectedMaterial: ThreeViewerModel.Material = null;

  constructor(public dialogRef: MatDialogRef<MaterialEditorComponent>, private context: ContextService, @Inject(MAT_DIALOG_DATA) public data: MaterialEditorData,
    public sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.selectedMaterial = this.data.model.materials[0];
  }

  newMaterial(): void {
    this.data.model.addMaterial("Default", "", this.data.model.meshes.map(x => createStandardMaterial()));
  }

  deleteMaterial(idx: number) {
    this.data.model.removeMaterial(idx);
  }

  getPreviewImage(url:string) : SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(`url('${url}')`);
  }

  async texture(material: MeshStandardMaterial, texture: TextureMap): Promise<void> {

    if (material[texture]) {
      material[texture] = null;
    } else {
      let file = await this.context.fileChooser({ type: "arraybuffer", accept: ".png,.jpg,.jpeg,.tga" });
      let url = URL.createObjectURL(new Blob([file]));
      let tex = await loadTexture(url);

      material[texture] = tex;
      tex.premultiplyAlpha = false;
      tex.needsUpdate = true;
    }

  }

}
