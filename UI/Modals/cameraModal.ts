import { App, Modal, Notice } from "obsidian";

export class ScannerModal extends Modal {
	container: HTMLElement;

	constructor(app: App) {
		super(app);
		this.setTitle("Scan Your Note");
		this.container = this.contentEl.createDiv();
		this.camera = new Camera(this.container);
	}

	async onOpen() {
         this.modalEl.style.width = "90vw";                    
         this.modalEl.style.height = "80vh";                   
                                                               
         this.container.style.width = "100%";                  
         this.container.style.height = "100%";                 
         this.container.style.display = "flex";                
         this.container.style.justifyContent = "center";       
         this.container.style.alignItems = "center";           
	}

	async onClose() {
	}
}
