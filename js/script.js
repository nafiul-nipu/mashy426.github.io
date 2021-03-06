var camera, renderer, scene, slider, points, blur, focus, anim_play,
    steps = [0.05, 0.06, 0.08, 0.09, 0.11, 0.12, 0.13],
    timeouts = [],
    nodes = [{ id: 'mammal' },
    { id: 'dog' },
    { id: 'cat' },
    { id: 'fox' },
    { id: 'elk' },
    { id: 'insect' },
    { id: 'ant' },
    { id: 'bee' },
    { id: 'fish' },
    { id: 'carp' },
    { id: 'pike' }],
    links = [{ target: 'mammal', source: 'dog', strength: 0.5 },
    { target: 'mammal', source: 'cat', strength: 0.5 },
    { target: 'mammal', source: 'fox', strength: 0.5 },
    { target: 'mammal', source: 'elk', strength: 0.5 },
    { target: 'insect', source: 'ant', strength: 0.5 },
    { target: 'insect', source: 'bee', strength: 0.5 },
    { target: 'fish', source: 'carp', strength: 0.5 },
    { target: 'fish', source: 'pike', strength: 0.5 },
    { target: 'cat', source: 'elk', strength: 0.1 },
    { target: 'carp', source: 'ant', strength: 0.1 },
    { target: 'elk', source: 'bee', strength: 0.1 },
    { target: 'dog', source: 'cat', strength: 0.1 },
    { target: 'fox', source: 'ant', strength: 0.1 },
    { target: 'pike', source: 'cat', strength: 0.1 }];

init();

function init() {
    // Camera
    camera = new THREE.PerspectiveCamera(1, (window.innerWidth * 1.6) / (window.innerHeight * 1.6), 1, 1000);
    camera.position.set(71, 71, 71);

    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor('hsl(0, 0%, 0%)', 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * 1.6, window.innerHeight * 1.6);
    document.getElementById('container').appendChild(renderer.domElement);
    cursors(renderer.domElement);

    // Controls
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', render);

    // Lights
    let ambient = new THREE.AmbientLight('hsl(0, 0%, 100%)', 0.25);
    let keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 0.6);
    let fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 60%, 85%)'), 0.6);
    let backLight = new THREE.DirectionalLight('hsl(0, 0%, 100%)', 0.4);

    keyLight.position.set(-1, 0, 1);
    fillLight.position.set(1, 0, 1);
    backLight.position.set(1, 0, -1).normalize();

    // Scene
    scene = new THREE.Scene();
    scene.add(ambient);
    scene.add(keyLight);
    scene.add(fillLight);
    scene.add(backLight);

    // Graph
    let graph = d3.select('#graph').append('svg')
        .attr('width', window.innerWidth * 0.3)
        .attr('height', window.innerHeight * 0.44);

    let forceLink = d3.forceLink()
        .id(link => { return link.id; })
        .strength(link => { return link.strength; });

    let forceSimulation = d3.forceSimulation()
        .force('link', forceLink)
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(window.innerWidth * 0.15, window.innerHeight * 0.22));

    let drag = d3.drag()
        .on('start', dragstart)
        .on('drag', node => {
            forceSimulation.alphaTarget(0.7).restart();
            node.fx = d3.event.x;
            node.fy = d3.event.y;
        });

    function dragstart(node) {
        node.fx = node.x;
        node.fy = node.y;
        d3.select(this).style('fill', 'hsl(350, 71%, 86%)');
    }

    function dblclick(node) {
        if (!d3.event.active)
            forceSimulation.alphaTarget(0);
        node.fx = null;
        node.fy = null;
        d3.select(this).style('fill', 'hsl(50, 65%, 75%)');
    }

    forceSimulation.nodes(nodes).on('tick', () => {
        nodeElements
            .attr('cx', node => { return node.x; })
            .attr('cy', node => { return node.y; });
        linkElements
            .attr('x1', link => { return link.source.x; })
            .attr('y1', link => { return link.source.y; })
            .attr('x2', link => { return link.target.x; })
            .attr('y2', link => { return link.target.y; });
    });

    let linkElements = graph.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter().append('line');

    let nodeElements = graph.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', 12)
        .on('dblclick', dblclick)
        .call(drag);

    setTimeout(forceSimulation.force('link').links, 400, links);

    // Slider
    let width = (window.innerWidth < 960) ? 480 : (window.innerWidth / 2)
    slider = d3.sliderBottom()
        .width(width - 60)
        .min(d3.min(steps))
        .max(d3.max(steps))
        .step(0.01)
        .default(steps[0])
        .tickFormat(d3.format('.2f'))
        .on('onchange', value => changeSlider(d3.format('.2f')(value)));

    d3.select('#slider')
        .append('svg')
        .attr('width', width)
        .attr('height', 70)
        .append('g')
        .attr('transform', 'translate(30, 30)')
        .call(slider);

    // Model
    let mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('models/');
    mtlLoader.load('nozzle.mtl', mtls => {
        mtls.preload();
        let objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(mtls);
        objLoader.setPath('models/');
        objLoader.load('nozzle.obj', obj => {
            obj.scale.set(20, 20, 20);
            obj.position.set(-0.001, -0.0905, 0);
            scene.add(obj);
        });
    });

    // Particles
    addParticles(d3.format('.2f')(slider.value()), true);
    play();

    // Events
    window.addEventListener('resize', resize, false);
    window.addEventListener('blur', blur, false);
    window.addEventListener('focus', focus, false);
    document.getElementById('play-pause-btn').addEventListener('click', playOrPause, false);
}

function addParticles(step, startup) {
    if (!steps.includes(parseFloat(step))) return;

    d3.csv('particles/' + step + '.csv', data => {
        return {
            x: parseFloat(data['Points:0']),
            y: parseFloat(data['Points:1']),
            z: parseFloat(data['Points:2'])
        };
    }).then(data => {
        let particles = new THREE.Geometry();
        data.forEach(d => particles.vertices.push(new THREE.Vector3(d.x, d.y, d.z)));
        if (points) scene.remove(points);
        points = new THREE.Points(particles, new THREE.PointsMaterial({ size: 0.2, color: 'hsl(50, 65%, 75%)' }));
        scene.add(points);

        setTimeout((pass => {
            if (pass < 3) {
                if (startup) {
                    document.body.style.cursor = 'default';
                    document.body.style.visibility = 'visible';
                }
                render();
                setTimeout(arguments.callee, 500, pass + 1);
            }
        }), 500, 0);
    });
}

function changeSlider(step) {
    addParticles(step, false);

    if (anim_play) {
        pause();
        play();
    }
}

function currentStep() {
    let step = d3.format('.2f')(slider.value());

    while (!steps.includes(parseFloat(step)))
        step = d3.format('.2f')(slider.value() + 0.01);

    return step;
}

function play() {
    if (anim_play) return;

    anim_play = true;
    document.getElementById('play-pause glyphicon').className = 'glyphicon glyphicon-pause';
    _play(steps.indexOf(parseFloat(currentStep())));

    function _play(step) {
        if (!anim_play) return;
        if (step < steps.length) {
            slider.value(steps[step]);
            timeouts.push(setTimeout(() => {
                step = currentStep();
                if (d3.format('.2f')(slider.value()) != step)
                    _play(steps.indexOf(parseFloat(step)));
                else
                    _play(steps.indexOf(parseFloat(step)) + 1);
            }, 2500));
        } else if (step === steps.length) {
            slider.value(steps[0]);
            timeouts.push(setTimeout(() => {
                step = currentStep();
                if (d3.format('.2f')(slider.value()) != step)
                    _play(steps.indexOf(parseFloat(step)));
                else
                    _play(steps.indexOf(parseFloat(step)) + 1);
            }, 2500));
        }
    }
}

function pause() {
    if (!anim_play) return;

    anim_play = false;
    timeouts.forEach(clearTimeout);
    timeouts = [];
    document.getElementById('play-pause glyphicon').className = 'glyphicon glyphicon-play';
}

function playOrPause() {
    if (anim_play)
        pause();
    else
        play();
}

function cursors(elem) {
    elem.onmousedown = e => {
        if (e.button === 0) elem.style.cursor = 'move';
        else if (e.button === 2) elem.style.cursor = 'ew-resize';
    };

    elem.onmouseup = () => {
        elem.style.cursor = 'default';
    };
}

function render() {
    renderer.render(scene, camera);
}

function resize() {
    camera.aspect = (window.innerWidth * 1.6) / (window.innerHeight * 1.6);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth * 1.6, window.innerHeight * 1.6);
    render();
}

function blur() {
    if (!focus) return;

    focus = false;
    if (anim_play) {
        blur = true;
        pause();
    }
}

function focus() {
    if (focus) return;

    focus = true;
    if (!anim_play && blur) {
        blur = false;
        play();
    }
}