new Vue({
    el: '#app',

    data () {
        return {
        	ERR_GRAPH_IS_TOO_LARGE: "Graph is too large!",
        	nGens: 2,
            rels:  [
            	[1, 0],
                [3, 2],
                [0, 0],
                [2, 2, 2],
                [0, 2, 1, 3]
            ],
            permReps: [],
            groupElements: []
        }
    },
    
    mounted () {
    	this.init();
    },

    methods: {
    	init: function () {
        	this.permReps = [];
            
            const LIMIT_CNT_FIND = 1e6;
            const ERR_GRAPH_IS_TOO_LARGE = this.ERR_GRAPH_IS_TOO_LARGE;

            let idents = [];
            let neighbors = [];
            let toVisit = 0;
            let cntFind = 0;

            let reversed = arr => [...arr].reverse();
            let nGens = this.nGens;
            let rels = [...this.rels];

            function find(c) {
            	cntFind++;
                
                if (cntFind > LIMIT_CNT_FIND) {
                	throw new Error(ERR_GRAPH_IS_TOO_LARGE);
                }

                if (c === idents[c]) {
                    return c;
                } else {
                    return idents[c] = find(idents[c]);
                }
            }

            function createNewNeighbor() {
                const c = idents.length;

                idents.push(c);
                neighbors.push(new Array(2 * nGens).fill(null));

                return c;
            }

            function unify(c1, c2) {
                c1 = find(c1);
                c2 = find(c2);

                if (c1 === c2) return;

                [c1, c2] = [Math.min(c1, c2), Math.max(c1, c2)];
                idents[c2] = c1;

                for (let d = 0; d < 2 * nGens; d++) {
                    const n1 = neighbors[c1][d];
                    const n2 = neighbors[c2][d];

                    if (n1 === null) {
                        neighbors[c1][d] = n2;
                    } else if (n2 !== null) {
                        unify(n1, n2);
                    }
                }
            }

            function follow(c, d) {
                c = find(c);

                let ns = neighbors[c];

                if (ns[d] === null) {
                    ns[d] = createNewNeighbor();
                }

                return find(ns[d]);
            }

            function followp(c, ds) {
                c = find(c);

                for (let d of reversed(ds)) {
                    c = follow(c, d);
                }

                return c;
            }

            const start = createNewNeighbor();

            while (toVisit < idents.length) {
                let c = find(toVisit);

                if (c === toVisit) {
                    for (let rel of rels) {
                        unify(followp(c, rel), c);
                    }
                }

                toVisit++;
            }

            let cosets = idents.filter((c, i) => c === i);
            let perms = [];

            for (let d = 0; d < nGens; d++) {
                perms.push(cosets.map((c, i) => cosets.indexOf(follow(c, 2 * d))));
            }

            let resolveCosetNames = () => {
                let cosetNames = {};
                let Q = [0];

                cosetNames[0] = [];

                while (Q.length > 0) {
                    let v = Q.shift();

                    for (let d = 0; d < this.nGens; d++) {
                        let v2 = follow(v, 2 * d);

                        if (!(v2 in cosetNames)) {
                            cosetNames[v2] = [d, ...cosetNames[v]];
                            Q.push(v2);
                        }
                    }
                }

                return Object.values(cosetNames);
            };

            this.groupElements = resolveCosetNames()
                .map((cosetName, i) => ({ i: i, prod: cosetName }));

            function cycle(perm) {
                let parts = [];

                for (let i = 0; i < perm.length; i++) {
                    let part = [i];
                    let k = perm[i];

                    while (k !== i) {
                        if (k < i) break;

                        part.push(k);
                        k = perm[k];
                    }

                    if (k >= i) {
                        parts.push(part);
                    }
                }
                
                return parts;
            }

            for (let d = 0; d < nGens; d++) {
            	let cy = cycle(perms[d]);
                this.permReps.push(cy);
            }

            // render a graph
            this.renderNetwork(perms);
		},
        
        n2x: function (n) {
        	let str = `x${Math.floor(n / 2)}`;
            if (n % 2 == 1) str += '^-1';
            return str;
        },
        
        updateGens: function () {
        	this.rels = [];
            this.registerInverses();
        },
        
        updateRels: function () {
        	let freshRels = [];
            
            for (let i = 0; i < this.rels.length; i++) {
            	let rel = this.rels[i];
                let firstNull = rel.indexOf(null);
                
                if (firstNull === -1) {
                	freshRels.push(rel);
                } else if (firstNull === 0) {
                	continue;
                } else {
                	freshRels.push(rel.slice(0, firstNull));
                }
            }
            
            this.rels = freshRels;
        },
        
        addRel: function () {
        	if (this.rels.length === 0) {
            	this.registerInverses();
            } else {
                let rel = this.rels[this.rels.length - 1].slice();
                this.rels.push(rel);
            }
        },
        
        onRun: function () {
        	try {
            	this.init();
            } catch (e) {
            	if (e.message == this.ERR_GRAPH_IS_TOO_LARGE) {
                	alert("Seems trapped in an infinite loop. Terminated forcibly.")
                } else {
                	alert("Something went wrong.")
                    throw e;
                }
                
                //Object.assign(this.$data, this.$options.data());
            }
        },
        
        registerInverses: function () {
            for (let i = 0; i < this.nGens; i++) {
            	this.rels.push([2 * i + 1, 2 * i]);
            }
        },

        renderNetwork: function (perms) {
            let nodes = Array(perms[0].length).fill(0).map((_, i) => {
                return {
                    id: i,
                    label: `${i + 1}`,
                    color: "#ccc",
                    title: this.el2x(i)
                }
            });
            let edges = [];

            perms.forEach((perm, i) => {
                perm.forEach((to, from) => {
                    edges.push({
                        from,
                        to,
                        label: `x${i}`,
                        arrows: {
                            to: true
                        }
                    });
                })
            });

            let container = this.$refs.network;
            let data = { nodes, edges };
            let options = {
                physics: {
                    stabilization: false,
                    wind: { x: 0, y: 0 }
                }
            };
            let network = new vis.Network(container, data, options);
        },

        el2x: function (i) {
            let el = this.groupElements[i];

            return el.prod.length === 0
                ? 'e'
                : el.prod.map(j => `x${j}`).join('');
        }
    }
});
