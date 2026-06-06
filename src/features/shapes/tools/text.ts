import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { TextObject } from '../models/text';
import { useStore } from '../../../store/useStore';
import { ChangeTextCommand } from '../commands/text';
import { CreateShapeCommand } from '../commands/create';
import { IShape } from '../types';
import { DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY } from '../../../config/constants';

export class TextTool extends BaseTool {
    activeText: TextObject | null;
    textarea: HTMLTextAreaElement | null;
    cursorPosition: number = 0;
    private originalText: string = '';
    private abortController: AbortController | null = null;

    constructor(editor: IEditorContext) {
        super(editor);
        this.activeText = null;
        this.textarea = null;
    }

    onDeactivate(): void {
        this.finishEditing();
    }

    onMouseDown(e: MouseEvent) {
        e.preventDefault();
        const { x, y } = this.editor.getMousePos(e);

        const clickedShape = this.findClickedText(x, y);

        if (clickedShape) {
            this.startEditing(clickedShape);
        } else {
            const newText = new TextObject(x, y, '', {
                fontSize: DEFAULT_FONT_SIZE,
                fontFamily: DEFAULT_FONT_FAMILY
            }, this.editor.activeLayerId);
            const command = new CreateShapeCommand(newText);
            this.editor.history.execute(command);
            useStore.getState().setSelectedShapes([newText.id]);
            this.startEditing(newText);
        }
        this.editor.render();
    }

    findClickedText(x: number, y: number): TextObject | null {
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            const shape = this.editor.shapes[i];
            if (shape.type === 'text') {
                const bounds = shape.getBounds ? shape.getBounds() : { minX: shape.x!, minY: shape.y!, maxX: shape.x! + 100, maxY: shape.y! + 20 };
                if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
                    return shape as unknown as TextObject;
                }
            }
        }
        return null;
    }

    startEditing(textObject: TextObject) {
        if (this.activeText === textObject && this.textarea) return;

        this.finishEditing();

        this.activeText = textObject;
        this.originalText = textObject.text;
        this.editor.selectedShapes = [textObject as unknown as IShape];

        this.textarea = document.createElement('textarea');
        this.textarea.style.position = 'absolute';
        this.textarea.style.top = '0';
        this.textarea.style.left = '0';
        this.textarea.style.width = '1px';
        this.textarea.style.height = '1px';
        this.textarea.style.overflow = 'hidden';
        this.textarea.style.opacity = '0';
        this.textarea.style.pointerEvents = 'none';
        this.textarea.style.zIndex = '-1';
        this.textarea.value = textObject.text;

        document.body.appendChild(this.textarea);
        this.textarea.focus();

        this.abortController = new AbortController();
        const { signal } = this.abortController;

        this.textarea.addEventListener('input', (e: Event) => {
            if (this.activeText) {
                const ta = e.target as HTMLTextAreaElement;
                this.activeText.text = ta.value;
                this.cursorPosition = ta.selectionStart ?? ta.value.length;
                this.editor.render();
            }
        }, { signal });

        this.textarea.addEventListener('keydown', () => {
            requestAnimationFrame(() => {
                if (this.textarea) {
                    this.cursorPosition = this.textarea.selectionStart ?? this.cursorPosition;
                }
            });
        }, { signal });

        this.textarea.addEventListener('keyup', () => {
            if (this.textarea) {
                this.cursorPosition = this.textarea.selectionStart ?? this.cursorPosition;
                this.editor.render();
            }
        }, { signal });

        this.textarea.addEventListener('mouseup', () => {
            if (this.textarea) {
                this.cursorPosition = this.textarea.selectionStart ?? this.cursorPosition;
                this.editor.render();
            }
        }, { signal });

        this.cursorPosition = textObject.text.length;
        this.textarea.selectionStart = this.textarea.selectionEnd = textObject.text.length;
    }

    finishEditing() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.textarea && this.textarea.parentNode) {
            this.textarea.parentNode.removeChild(this.textarea);
            this.textarea = null;
        }
        this.cursorPosition = 0;
        if (this.activeText) {
            const currentText = this.activeText.text;
            if (currentText.trim() === '') {
                this.editor.history.undo();
            } else if (currentText !== this.originalText) {
                const command = new ChangeTextCommand(this.activeText.id, this.originalText, currentText);
                this.editor.history.execute(command);
            }
            this.activeText = null;
            this.editor.render();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            this.finishEditing();
        }
    }
}
