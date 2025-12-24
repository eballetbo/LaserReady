import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { TextObject } from '../models/text';

export class TextTool extends BaseTool {
    activeText: any | null; // TextObject
    textarea: HTMLTextAreaElement | null;

    constructor(editor: IEditorContext) {
        super(editor);
        this.activeText = null;
        this.textarea = null;
    }

    onMouseDown(e: MouseEvent) {
        e.preventDefault();
        const { x, y } = this.editor.getMousePos(e);

        // Check if clicked on existing text
        const clickedShape = this.findClickedText(x, y);

        if (clickedShape) {
            this.startEditing(clickedShape);
        } else {
            // Create new text
            const newText = new TextObject(x, y, '', {
                fontSize: 24,
                fontFamily: 'Arial'
            }, this.editor.activeLayerId);
            this.editor.shapes.push(newText);
            this.editor.selectedShapes = [newText];
            this.startEditing(newText);
        }
        this.editor.render();
    }

    findClickedText(x: number, y: number): any | null {
        // Simple bounds check
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            const shape = this.editor.shapes[i];
            if (shape.type === 'text') {
                const bounds = shape.getBounds ? shape.getBounds() : { minX: shape.x, minY: shape.y, maxX: shape.x + 100, maxY: shape.y + 20 };
                if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
                    return shape;
                }
            }
        }
        return null;
    }

    startEditing(textObject: any) {
        if (this.activeText === textObject && this.textarea) return;

        this.finishEditing(); // Finish previous editing if any

        this.activeText = textObject;
        this.editor.selectedShapes = [textObject];

        // Create hidden textarea
        this.textarea = document.createElement('textarea');
        this.textarea.style.position = 'absolute';
        this.textarea.style.opacity = '0'; // Hidden but focused
        this.textarea.style.pointerEvents = 'none';
        this.textarea.style.zIndex = '-1';
        this.textarea.value = textObject.text;

        document.body.appendChild(this.textarea);
        this.textarea.focus();

        // Sync input
        this.textarea.addEventListener('input', (e: Event) => {
            if (this.activeText) {
                this.activeText.text = (e.target as HTMLTextAreaElement).value;
                this.editor.render();
            }
        });

        // Blur handler to finish editing
        this.textarea.addEventListener('blur', () => {
            // Delay slightly to allow click to register? 
            // Actually, if we click canvas, we handle it.
            // But if we click properties panel, we might want to keep editing?
            // For now, let's finish editing on blur, but maybe we need to be careful.
            // If user clicks Font dropdown, textarea loses focus.
            // We should probably NOT destroy textarea on blur immediately if we want to keep editing while changing properties.
            // But standard behavior is: click canvas -> finish.
            // Click properties -> keep selected but maybe stop typing?

            // Let's rely on tool change or click outside to finish.
            // But we need to remove textarea eventually.
            // Let's keep it simple: finish on tool change or new selection.
        });
    }

    finishEditing() {
        if (this.textarea) {
            document.body.removeChild(this.textarea);
            this.textarea = null;
        }
        if (this.activeText) {
            if (this.activeText.text.trim() === '') {
                // Remove empty text object
                const index = this.editor.shapes.indexOf(this.activeText);
                if (index > -1) this.editor.shapes.splice(index, 1);
            }
            this.activeText = null;
            this.editor.render();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        // If we are editing, textarea handles input.
        // But we might want to handle Escape to cancel/finish.
        if (e.key === 'Escape') {
            this.finishEditing();
        }
    }
}
