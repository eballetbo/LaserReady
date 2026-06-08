import paper from 'paper';
import { PathShape } from '../../features/shapes/models/path';
import { PathNode } from '../../features/shapes/models/node';

export const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export function toPaperPath(shape: PathShape): paper.Path {
    const path = new scope.Path({
        closed: shape.closed
    });

    shape.nodes.forEach(node => {
        const point = new scope.Point(node.x, node.y);
        const handleIn = new scope.Point(node.cpIn.x - node.x, node.cpIn.y - node.y);
        const handleOut = new scope.Point(node.cpOut.x - node.x, node.cpOut.y - node.y);

        path.add(new scope.Segment(point, handleIn, handleOut));
    });

    return path;
}

export function fromPaperItem(item: paper.Item): PathShape[] {
    const shapes: PathShape[] = [];

    const processPath = (path: paper.Path) => {
        if (!path.segments || path.segments.length === 0) return;

        const nodes = path.segments.map(seg => {
            const x = seg.point.x;
            const y = seg.point.y;
            const cpInX = x + seg.handleIn.x;
            const cpInY = y + seg.handleIn.y;
            const cpOutX = x + seg.handleOut.x;
            const cpOutY = y + seg.handleOut.y;

            return new PathNode(x, y, cpInX, cpInY, cpOutX, cpOutY);
        });
        shapes.push(new PathShape(nodes, path.closed));
    };

    if (item instanceof scope.CompoundPath) {
        item.children.forEach(child => processPath(child as paper.Path));
    } else if (item instanceof scope.Path) {
        processPath(item);
    }

    return shapes;
}
