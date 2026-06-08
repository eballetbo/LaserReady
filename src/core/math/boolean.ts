import { PathShape } from '../../features/shapes/models/path';
import { scope, toPaperPath, fromPaperItem } from './paper-scope';

type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude';

export const BooleanOperations = {
    getPaperScope() {
        return scope;
    },

    toPaperPath(shape: PathShape) {
        return toPaperPath(shape);
    },

    fromPaperItem(item: paper.Item) {
        return fromPaperItem(item);
    },

    perform(shapes: PathShape[], operation: BooleanOperation): PathShape[] | null {
        if (!shapes || shapes.length < 2) return shapes;

        let items: paper.Path[] = [];

        try {
            items = shapes.map(s => this.toPaperPath(s));

            let result: paper.PathItem = items[0];

            for (let i = 1; i < items.length; i++) {
                const next = items[i];
                const prev = result;

                switch (operation) {
                    case 'unite':
                        result = result.unite(next);
                        break;
                    case 'subtract':
                        result = result.subtract(next);
                        break;
                    case 'intersect':
                        result = result.intersect(next);
                        break;
                    case 'exclude':
                        result = result.exclude(next);
                        break;
                }

                if (prev !== items[0] && prev !== result) {
                    prev.remove();
                }
            }

            const resultShapes = this.fromPaperItem(result);

            if (result !== items[0]) result.remove();

            return resultShapes;
        } catch (error) {
            console.error(`Boolean operation '${operation}' failed:`, error);
            return null;
        } finally {
            items.forEach(i => i.remove());
        }
    },

    unite(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'unite'); },
    subtract(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'subtract'); },
    intersect(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'intersect'); },
    exclude(shapes: PathShape[]): PathShape[] | null { return this.perform(shapes, 'exclude'); }
};
