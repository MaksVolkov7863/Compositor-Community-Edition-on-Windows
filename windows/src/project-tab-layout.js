/**
 * ProjectTabLayout - Dynamic tab strip layout and overflow pill geometry
 * 
 * Matches Swift projectTabOverflow (Compositor/UI/ProjectTabLayout.swift)
 */

function projectTabOverflow({ order, widths, selectedID, availableWidth, pillWidth = () => 80, spacing = 6 }) {
    if (!order || order.length === 0) {
        return {
            visible: [],
            hiddenIDs: [],
            pill: null,
            contentWidth: 0
        };
    }

    // Unmeasured width (availableWidth <= 0): show everything with no pill
    if (availableWidth <= 0) {
        let x = 0;
        const visible = order.map(id => {
            const w = widths[id] || 100;
            const item = { id, x, width: w };
            x += w + spacing;
            return item;
        });
        return {
            visible,
            hiddenIDs: [],
            pill: null,
            contentWidth: Math.max(0, x - spacing)
        };
    }

    // Check if all tabs fit without overflow
    let totalAllWidth = 0;
    for (let i = 0; i < order.length; i++) {
        totalAllWidth += (widths[order[i]] || 100);
        if (i < order.length - 1) totalAllWidth += spacing;
    }

    if (totalAllWidth <= availableWidth) {
        let x = 0;
        const visible = order.map(id => {
            const w = widths[id] || 100;
            const item = { id, x, width: w };
            x += w + spacing;
            return item;
        });
        return {
            visible,
            hiddenIDs: [],
            pill: null,
            contentWidth: totalAllWidth
        };
    }

    // Overflow occurs: calculate visible from right, accounting for pill on left
    const pillW = typeof pillWidth === 'function' ? pillWidth(order.length) : pillWidth;
    const remainingWidth = availableWidth - pillW - spacing;

    let fittingTabs = [];
    let currentWidth = 0;

    for (let i = order.length - 1; i >= 0; i--) {
        const id = order[i];
        const tabW = widths[id] || 100;
        const needed = currentWidth === 0 ? tabW : (currentWidth + spacing + tabW);

        if (needed <= remainingWidth) {
            fittingTabs.unshift(id);
            currentWidth = needed;
        } else {
            break;
        }
    }

    // Ensure selected tab is visible if it would be hidden
    if (selectedID && !fittingTabs.includes(selectedID) && order.includes(selectedID)) {
        if (fittingTabs.length > 0) {
            // Replace first fitting tab with selected tab
            fittingTabs[0] = selectedID;
        } else {
            fittingTabs = [selectedID];
        }
    }

    const hiddenIDs = order.filter(id => !fittingTabs.includes(id));

    let x = pillW + spacing;
    const visible = fittingTabs.map(id => {
        const w = widths[id] || 100;
        const item = { id, x, width: w };
        x += w + spacing;
        return item;
    });

    const contentWidth = x - spacing;

    return {
        visible,
        hiddenIDs,
        pill: { width: pillW },
        contentWidth
    };
}

function projectTabOverflowLabel(count) {
    if (count === 1) return '1 more tab';
    return `${count} more tabs`;
}

if (typeof module !== 'undefined') {
    module.exports = {
        projectTabOverflow,
        projectTabOverflowLabel
    };
}
