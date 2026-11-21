import { useStore } from '../../../store/useStore';
import { useLanguage } from '../../../contexts/useLanguage';
import { ThemeColors } from '../../../config/themes';
import { CanvasController } from '../../editor/controller';
import { ChangeNodeTypeCommand, DeleteNodeCommand } from '../../shapes/commands/node';
import { ConvertSegmentToLineCommand, ConvertSegmentToCurveCommand } from '../../shapes/commands/segment';
import { BreakPathCommand } from '../../shapes/commands/break-path';
import { Command } from '../../../core/commands/command';
import {
    IconNodeCorner,
    IconNodeSmooth,
    IconNodeSymmetric,
    IconSegmentLine,
    IconSegmentCurve,
    IconNodeBreak,
    IconDeleteNode,
    IconNodeAdd,
    IconNodeJoin,
    IconJoinSegment,
    IconDeleteSegment,
} from '../icons';
import { notify } from '../toast-utils';
import { Button } from './Button';
import { SectionHeader } from './SectionHeader';

interface NodeOperationsSectionProps {
    theme: ThemeColors;
    editor: CanvasController | null;
    shapeId: string;
}

export function NodeOperationsSection({ theme, editor, shapeId }: NodeOperationsSectionProps) {
    const { t } = useLanguage();
    const selectedNodeIndices = useStore(state => state.selectedNodeIndices);
    const hasSelectedNodes = selectedNodeIndices.length > 0;

    const runForSelectedNodes = (buildCommand: (idx: number) => Command) => {
        const indices = useStore.getState().selectedNodeIndices;
        if (!editor || indices.length === 0) return;
        indices.forEach(idx => editor.history.execute(buildCommand(idx)));
        editor.render();
    };

    return (
        <div>
            <SectionHeader>{t('nodeOperations') || 'Node Operations'}</SectionHeader>
            <div className="grid grid-cols-4 gap-2">
                <Button
                    variant="icon"
                    onClick={() => notify('Insert Node: double-click a segment on the canvas', 'info')}
                    icon={IconNodeAdd}
                    label={t('Add') || 'Add'}
                    theme={theme}
                    className="text-gray-500"
                    title="Insert new node (Double-click segment)"
                />
                <Button
                    variant="icon"
                    onClick={() => {
                        const indices = useStore.getState().selectedNodeIndices;
                        if (editor && indices.length > 0) {
                            editor.history.execute(new DeleteNodeCommand(shapeId, indices));
                            useStore.getState().setSelectedNodeIndices([]);
                            editor.render();
                        }
                    }}
                    icon={IconDeleteNode}
                    label={t('Delete') || 'Delete'}
                    theme={{ ...theme, buttonHover: 'hover:bg-red-500/10 hover:border-red-500 hover:text-red-500', iconColor: 'text-red-500' }}
                    className="text-red-500 border-red-200 dark:border-red-900/30"
                    disabled={!hasSelectedNodes}
                    title="Delete selected nodes (Del/Backspace)"
                />
                <Button
                    variant="icon"
                    onClick={() => notify('Join Nodes is not yet implemented', 'info')}
                    icon={IconNodeJoin}
                    label={t('Join') || 'Join'}
                    theme={theme}
                    title="Join selected nodes (Merge)"
                />
                <Button
                    variant="icon"
                    onClick={() => runForSelectedNodes(idx => new BreakPathCommand(shapeId, idx))}
                    icon={IconNodeBreak}
                    label={t('Break') || 'Break'}
                    theme={theme}
                    disabled={!hasSelectedNodes}
                    title="Break path at selected nodes"
                />
                <Button
                    variant="icon"
                    onClick={() => notify('Join Segment is not yet implemented', 'info')}
                    icon={IconJoinSegment}
                    label={t('Join Seg') || 'Join Seg'}
                    theme={theme}
                    title="Join selected endnodes with new segment"
                />
                <Button
                    variant="icon"
                    onClick={() => notify('Delete Segment is not yet implemented', 'info')}
                    icon={IconDeleteSegment}
                    label={t('Del Seg') || 'Del Seg'}
                    theme={theme}
                    title="Delete segment between two non-endpoint nodes"
                />
                <div className="hidden" />
                <div className="hidden" />
                <Button
                    variant="icon"
                    onClick={() => runForSelectedNodes(idx => new ChangeNodeTypeCommand(shapeId, idx, 'corner'))}
                    icon={IconNodeCorner}
                    label={t('Corner') || 'Corner'}
                    theme={theme}
                    disabled={!hasSelectedNodes}
                    title="Make selected nodes corner (C)"
                />
                <Button
                    variant="icon"
                    onClick={() => runForSelectedNodes(idx => new ChangeNodeTypeCommand(shapeId, idx, 'smooth'))}
                    icon={IconNodeSmooth}
                    label={t('Smooth') || 'Smooth'}
                    theme={theme}
                    disabled={!hasSelectedNodes}
                    title="Make selected nodes smooth (S)"
                />
                <Button
                    variant="icon"
                    onClick={() => runForSelectedNodes(idx => new ChangeNodeTypeCommand(shapeId, idx, 'symmetric'))}
                    icon={IconNodeSymmetric}
                    label={t('Symmetric') || 'Symmetric'}
                    theme={theme}
                    disabled={!hasSelectedNodes}
                    title="Make selected nodes symmetric (Y)"
                />
                <div />
                <Button
                    variant="icon"
                    onClick={() => runForSelectedNodes(idx => new ConvertSegmentToLineCommand(shapeId, idx))}
                    icon={IconSegmentLine}
                    label={t('toLine') || 'Line'}
                    theme={theme}
                    disabled={!hasSelectedNodes}
                    title="Make selected segments lines (L)"
                />
                <Button
                    variant="icon"
                    onClick={() => runForSelectedNodes(idx => new ConvertSegmentToCurveCommand(shapeId, idx))}
                    icon={IconSegmentCurve}
                    label={t('toCurve') || 'Curve'}
                    theme={theme}
                    disabled={!hasSelectedNodes}
                    title="Make selected segments curves (B)"
                />
            </div>
        </div>
    );
}
