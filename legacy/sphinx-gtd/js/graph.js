// Graph Visualization
const Graph = {
    network: null,
    nodes: null,
    edges: null,

    init() {
        this.nodes = new vis.DataSet([]);
        this.edges = new vis.DataSet([]);
        this.renderGraph();
        this.setupEventListeners();
    },

    setupEventListeners() {
        document.getElementById('refreshGraph').addEventListener('click', () => {
            this.updateGraph();
        });

        document.getElementById('zoomIn').addEventListener('click', () => {
            if (this.network) {
                const scale = this.network.getScale();
                this.network.moveTo({ scale: scale * 1.2 });
            }
        });

        document.getElementById('zoomOut').addEventListener('click', () => {
            if (this.network) {
                const scale = this.network.getScale();
                this.network.moveTo({ scale: scale * 0.8 });
            }
        });

        document.getElementById('resetZoom').addEventListener('click', () => {
            if (this.network) {
                this.network.fit();
            }
        });
    },

    renderGraph() {
        const container = document.getElementById('graphCanvas');
        const data = {
            nodes: this.nodes,
            edges: this.edges,
        };

        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: {
                    size: 14,
                    color: '#f1f5f9',
                },
                borderWidth: 2,
                color: {
                    border: '#6366f1',
                    background: '#1e293b',
                    highlight: {
                        border: '#8b5cf6',
                        background: '#334155',
                    },
                },
            },
            edges: {
                width: 2,
                color: {
                    color: '#475569',
                    highlight: '#6366f1',
                },
                smooth: {
                    type: 'continuous',
                },
            },
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 200,
                },
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 200,
                    springConstant: 0.04,
                    damping: 0.09,
                },
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true,
            },
        };

        this.network = new vis.Network(container, data, options);

        // Handle node click
        this.network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const node = this.nodes.get(nodeId);
                if (node && node.type === 'note') {
                    // Open note modal (notes view removed - open modal directly)
                    setTimeout(() => {
                        if (typeof Notes !== 'undefined') {
                            Notes.openNote(nodeId);
                        }
                    }, 100);
                }
            }
        });
    },

    updateGraph() {
        const notes = Storage.getNotes();
        const todos = Storage.getTodos();
        const graphNodes = [];
        const graphEdges = [];

        // Add note nodes
        Object.entries(notes).forEach(([id, note]) => {
            graphNodes.push({
                id: id,
                label: note.title || 'Без названия',
                type: 'note',
                group: 'note',
                title: `Заметка: ${note.title || 'Без названия'}`,
            });

            // Extract links from note content
            const linkRegex = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = linkRegex.exec(note.content)) !== null) {
                const linkedNoteTitle = match[1];
                // Find note with matching title
                const linkedNote = Object.entries(notes).find(
                    ([_, n]) => n.title === linkedNoteTitle
                );
                if (linkedNote) {
                    graphEdges.push({
                        from: id,
                        to: linkedNote[0],
                        arrows: 'to',
                    });
                }
            }
        });

        // Add todo list nodes
        Object.entries(todos).forEach(([id, todoList]) => {
            graphNodes.push({
                id: id,
                label: todoList.title || 'Без названия',
                type: 'todo',
                group: 'todo',
                title: `Todo список: ${todoList.title || 'Без названия'}`,
                shape: 'box',
            });
        });

        // Update graph
        this.nodes.clear();
        this.edges.clear();
        this.nodes.add(graphNodes);
        this.edges.add(graphEdges);

        // Save graph data
        Storage.saveGraphData({
            nodes: graphNodes,
            edges: graphEdges,
        });
    },
};
