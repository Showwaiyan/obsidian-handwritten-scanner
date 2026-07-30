export class App {}
export class Plugin {}
export class PluginSettingTab {
	app: any;
	plugin: any;
	containerEl: HTMLElement;
	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
}

export class Setting {
	containerEl: HTMLElement;
	settingEl: HTMLElement;
	nameEl: HTMLElement;
	descEl: HTMLElement;
	controlEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
		this.settingEl = containerEl.createDiv ? containerEl.createDiv("setting-item") : document.createElement("div");
		this.nameEl = document.createElement("div");
		this.descEl = document.createElement("div");
		this.controlEl = document.createElement("div");
	}

	setName(name: string) {
		this.nameEl.textContent = name;
		return this;
	}

	setDesc(desc: string) {
		this.descEl.textContent = desc;
		return this;
	}

	addText(cb: (text: any) => void) {
		const text = new TextComponent(this.controlEl);
		cb(text);
		return this;
	}

	addButton(cb: (btn: any) => void) {
		const btn = new ButtonComponent(this.controlEl);
		cb(btn);
		return this;
	}
}

export class Modal {
	app: any;
	contentEl: HTMLElement;
	modalEl: HTMLElement;
	constructor(app: any) {
		this.app = app;
		this.contentEl = document.createElement("div");
		this.modalEl = document.createElement("div");
	}
	open() {}
	close() {}
	setTitle(title: string) {}
}

export class Notice {
	message: string;
	timeout: number;
	constructor(message: string, timeout: number = 2000) {
		this.message = message;
		this.timeout = timeout;
	}
	hide() {}
}

export class ButtonComponent {
	buttonEl: HTMLButtonElement;
	constructor(container: HTMLElement) {
		this.buttonEl = document.createElement("button");
		if (container && container.appendChild) {
			container.appendChild(this.buttonEl);
		}
	}
	setButtonText(text: string) {
		this.buttonEl.textContent = text;
		return this;
	}
	setIcon(icon: string) {
		return this;
	}
	setTooltip(tooltip: string) {
		return this;
	}
	setCta() {
		return this;
	}
	setWarning() {
		return this;
	}
	setDisabled(disabled: boolean) {
		this.buttonEl.disabled = disabled;
		return this;
	}
	onClick(cb: () => void) {
		this.buttonEl.addEventListener("click", cb);
		return this;
	}
}

export class TextComponent {
	inputEl: HTMLInputElement;
	constructor(container: HTMLElement) {
		this.inputEl = document.createElement("input");
		if (container && container.appendChild) {
			container.appendChild(this.inputEl);
		}
	}
	setPlaceholder(ph: string) {
		this.inputEl.placeholder = ph;
		return this;
	}
	setValue(val: string) {
		this.inputEl.value = val;
		return this;
	}
	getValue() {
		return this.inputEl.value;
	}
	onChange(cb: (val: string) => void) {
		this.inputEl.addEventListener("input", () => cb(this.inputEl.value));
		return this;
	}
}

export class DropdownComponent {
	selectEl: HTMLSelectElement;
	constructor(container: HTMLElement) {
		this.selectEl = document.createElement("select");
		if (container && container.appendChild) {
			container.appendChild(this.selectEl);
		}
	}
	addOption(value: string, display: string) {
		const opt = document.createElement("option");
		opt.value = value;
		opt.textContent = display;
		this.selectEl.appendChild(opt);
		return this;
	}
	setValue(val: string) {
		this.selectEl.value = val;
		return this;
	}
	getValue() {
		return this.selectEl.value;
	}
	onChange(cb: (val: string) => void) {
		this.selectEl.addEventListener("change", () => cb(this.selectEl.value));
		return this;
	}
}
