
const API_BASE = '/api';


let produtos = [];
let categorias = [];
let produtoEditando = null;
let categoriaEditando = null;


document.addEventListener('DOMContentLoaded', function() {
    carregarCategorias();
    carregarProdutos();
    configurarEventListeners();
    atualizarRelatorios();
});


function configurarEventListeners() {
   
    document.getElementById('buscarProduto').addEventListener('input', filtrarProdutos);
    document.getElementById('filtroCategoria').addEventListener('change', filtrarProdutos);
    document.getElementById('filtroEstoqueBaixo').addEventListener('change', filtrarProdutos);
    
    // Forms
    document.getElementById('formProduto').addEventListener('submit', salvarProduto);
    document.getElementById('formCategoria').addEventListener('submit', salvarCategoria);
    document.getElementById('formEstoque').addEventListener('submit', atualizarEstoque);
    
  
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                fecharModal(modal.id);
            }
        });
    });
}


function mostrarAba(aba) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    
    event.target.classList.add('active');
    document.getElementById(aba).classList.add('active');
    

    if (aba === 'relatorios') {
        atualizarRelatorios();
    }
}


async function fazerRequisicao(url, opcoes = {}) {
    mostrarLoading(true);
    try {
        const response = await fetch(API_BASE + url, {
            headers: {
                'Content-Type': 'application/json',
                ...opcoes.headers
            },
            ...opcoes
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.erro || 'Erro na requisição');
        }
        
        return data;
    } catch (error) {
        mostrarToast(error.message, 'error');
        throw error;
    } finally {
        mostrarLoading(false);
    }
}

async function carregarCategorias() {
    try {
        categorias = await fazerRequisicao('/categorias');
        atualizarSelectCategorias();
        renderizarCategorias();
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

async function carregarProdutos() {
    try {
        produtos = await fazerRequisicao('/produtos');
        renderizarProdutos();
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
    }
}

function renderizarProdutos(produtosFiltrados = produtos) {
    const tbody = document.getElementById('tabelaProdutos');
    
    if (produtosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #718096;">Nenhum produto encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = produtosFiltrados.map(produto => `
        <tr>
            <td>
                <div>
                    <strong>${produto.nome}</strong>
                    ${produto.codigo_barras ? `<br><small style="color: #718096;">${produto.codigo_barras}</small>` : ''}
                </div>
            </td>
            <td>${produto.categoria_nome || 'Sem categoria'}</td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${produto.quantidade_estoque}</span>
                    <button class="btn btn-small btn-outline" onclick="abrirModalEstoque(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
            <td>
                <span class="status-badge ${getStatusClass(produto)}">
                    ${getStatusText(produto)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" onclick="editarProduto(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deletarProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderizarCategorias() {
    const tbody = document.getElementById('tabelaCategorias');
    
    if (categorias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #718096;">Nenhuma categoria encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = categorias.map(categoria => {
        const produtosCount = produtos.filter(p => p.categoria_id === categoria.id).length;
        return `
            <tr>
                <td><strong>${categoria.nome}</strong></td>
                <td>${categoria.descricao || '-'}</td>
                <td>${produtosCount} produto${produtosCount !== 1 ? 's' : ''}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-secondary" onclick="editarCategoria(${categoria.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deletarCategoria(${categoria.id})" ${produtosCount > 0 ? 'disabled title="Não é possível deletar categoria com produtos"' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function atualizarSelectCategorias() {
    const selects = ['produtoCategoria', 'filtroCategoria'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const opcaoAtual = select.value;
        
        // Manter primeira opção
        const primeiraOpcao = select.querySelector('option').outerHTML;
        
        select.innerHTML = primeiraOpcao + categorias.map(categoria => 
            `<option value="${categoria.id}">${categoria.nome}</option>`
        ).join('');
        
       
        if (opcaoAtual) {
            select.value = opcaoAtual;
        }
    });
}

function filtrarProdutos() {
    const busca = document.getElementById('buscarProduto').value.toLowerCase();
    const categoriaId = document.getElementById('filtroCategoria').value;
    const estoqueBaixo = document.getElementById('filtroEstoqueBaixo').checked;
    
    let produtosFiltrados = produtos;
    
    if (busca) {
        produtosFiltrados = produtosFiltrados.filter(produto => 
            produto.nome.toLowerCase().includes(busca) ||
            (produto.codigo_barras && produto.codigo_barras.toLowerCase().includes(busca))
        );
    }
    
    if (categoriaId) {
        produtosFiltrados = produtosFiltrados.filter(produto => 
            produto.categoria_id == categoriaId
        );
    }
    
    if (estoqueBaixo) {
        produtosFiltrados = produtosFiltrados.filter(produto => produto.estoque_baixo);
    }
    
    renderizarProdutos(produtosFiltrados);
}


function getStatusClass(produto) {
    if (produto.quantidade_estoque === 0) return 'status-out';
    if (produto.estoque_baixo) return 'status-low';
    return 'status-ok';
}

function getStatusText(produto) {
    if (produto.quantidade_estoque === 0) return 'Sem estoque';
    if (produto.estoque_baixo) return 'Estoque baixo';
    return 'OK';
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    modal.style.display = 'flex';
    
   
    if (modalId === 'modalProduto' && !produtoEditando) {
        document.getElementById('formProduto').reset();
        document.getElementById('produtoId').value = '';
        document.getElementById('tituloModalProduto').textContent = 'Novo Produto';
    }
    
    if (modalId === 'modalCategoria' && !categoriaEditando) {
        document.getElementById('formCategoria').reset();
        document.getElementById('categoriaId').value = '';
        document.getElementById('tituloModalCategoria').textContent = 'Nova Categoria';
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    modal.style.display = 'none';
    
    // Limpar estado de edição
    if (modalId === 'modalProduto') {
        produtoEditando = null;
    }
    if (modalId === 'modalCategoria') {
        categoriaEditando = null;
    }
}


async function salvarProduto(event) {
    event.preventDefault();
    
    const dados = {
        nome: document.getElementById('produtoNome').value,
        descricao: document.getElementById('produtoDescricao').value,
        preco: parseFloat(document.getElementById('produtoPreco').value),
        categoria_id: parseInt(document.getElementById('produtoCategoria').value),
        quantidade_estoque: parseInt(document.getElementById('produtoEstoque').value) || 0,
        quantidade_minima: parseInt(document.getElementById('produtoEstoqueMinimo').value) || 5,
        codigo_barras: document.getElementById('produtoCodigoBarras').value || null
    };
    
    try {
        const produtoId = document.getElementById('produtoId').value;
        
        if (produtoId) {
            // Editar
            await fazerRequisicao(`/produtos/${produtoId}`, {
                method: 'PUT',
                body: JSON.stringify(dados)
            });
            mostrarToast('Produto atualizado com sucesso!', 'success');
        } else {
            // Criar
            await fazerRequisicao('/produtos', {
                method: 'POST',
                body: JSON.stringify(dados)
            });
            mostrarToast('Produto criado com sucesso!', 'success');
        }
        
        fecharModal('modalProduto');
        carregarProdutos();
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
    }
}

function editarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    produtoEditando = produto;
    
    document.getElementById('produtoId').value = produto.id;
    document.getElementById('produtoNome').value = produto.nome;
    document.getElementById('produtoDescricao').value = produto.descricao || '';
    document.getElementById('produtoPreco').value = produto.preco;
    document.getElementById('produtoCategoria').value = produto.categoria_id;
    document.getElementById('produtoEstoque').value = produto.quantidade_estoque;
    document.getElementById('produtoEstoqueMinimo').value = produto.quantidade_minima;
    document.getElementById('produtoCodigoBarras').value = produto.codigo_barras || '';
    
    document.getElementById('tituloModalProduto').textContent = 'Editar Produto';
    abrirModal('modalProduto');
}

async function deletarProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;
    
    if (!confirm(`Tem certeza que deseja deletar o produto "${produto.nome}"?`)) {
        return;
    }
    
    try {
        await fazerRequisicao(`/produtos/${id}`, { method: 'DELETE' });
        mostrarToast('Produto deletado com sucesso!', 'success');
        carregarProdutos();
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
    }
}


async function salvarCategoria(event) {
    event.preventDefault();
    
    const dados = {
        nome: document.getElementById('categoriaNome').value,
        descricao: document.getElementById('categoriaDescricao').value
    };
    
    try {
        const categoriaId = document.getElementById('categoriaId').value;
        
        if (categoriaId) {
            // Editar
            await fazerRequisicao(`/categorias/${categoriaId}`, {
                method: 'PUT',
                body: JSON.stringify(dados)
            });
            mostrarToast('Categoria atualizada com sucesso!', 'success');
        } else {
            // Criar
            await fazerRequisicao('/categorias', {
                method: 'POST',
                body: JSON.stringify(dados)
            });
            mostrarToast('Categoria criada com sucesso!', 'success');
        }
        
        fecharModal('modalCategoria');
        carregarCategorias();
        carregarProdutos(); // Recarregar para atualizar nomes das categorias
    } catch (error) {
        console.error('Erro ao salvar categoria:', error);
    }
}

function editarCategoria(id) {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) return;
    
    categoriaEditando = categoria;
    
    document.getElementById('categoriaId').value = categoria.id;
    document.getElementById('categoriaNome').value = categoria.nome;
    document.getElementById('categoriaDescricao').value = categoria.descricao || '';
    
    document.getElementById('tituloModalCategoria').textContent = 'Editar Categoria';
    abrirModal('modalCategoria');
}

async function deletarCategoria(id) {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) return;
    
    if (!confirm(`Tem certeza que deseja deletar a categoria "${categoria.nome}"?`)) {
        return;
    }
    
    try {
        await fazerRequisicao(`/categorias/${id}`, { method: 'DELETE' });
        mostrarToast('Categoria deletada com sucesso!', 'success');
        carregarCategorias();
        carregarProdutos();
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
    }
}


function abrirModalEstoque(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;
    
    document.getElementById('estoqueId').value = produto.id;
    document.getElementById('estoqueProdutoNome').textContent = produto.nome;
    document.getElementById('estoqueOperacao').value = 'definir';
    document.getElementById('estoqueQuantidade').value = '';
    
    abrirModal('modalEstoque');
}

async function atualizarEstoque(event) {
    event.preventDefault();
    
    const produtoId = document.getElementById('estoqueId').value;
    const operacao = document.getElementById('estoqueOperacao').value;
    const quantidade = parseInt(document.getElementById('estoqueQuantidade').value);
    
    try {
        await fazerRequisicao(`/produtos/${produtoId}/estoque`, {
            method: 'PUT',
            body: JSON.stringify({ operacao, quantidade })
        });
        
        mostrarToast('Estoque atualizado com sucesso!', 'success');
        fecharModal('modalEstoque');
        carregarProdutos();
    } catch (error) {
        console.error('Erro ao atualizar estoque:', error);
    }
}

async function atualizarRelatorios() {
    try {
       
        const estoqueBaixo = await fazerRequisicao('/relatorios/estoque-baixo');
        document.getElementById('produtosEstoqueBaixo').textContent = estoqueBaixo.total;
        
       
        const valorEstoque = await fazerRequisicao('/relatorios/valor-estoque');
        document.getElementById('valorTotalEstoque').textContent = 
            `R$ ${valorEstoque.valor_total_estoque.toFixed(2)}`;
            
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
    }
}

async function verEstoqueBaixo() {
    try {
        const dados = await fazerRequisicao('/relatorios/estoque-baixo');
        const detalhes = document.getElementById('detalhesEstoqueBaixo');
        const tbody = document.getElementById('tabelaEstoqueBaixo');
        
        if (dados.produtos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #718096;">Nenhum produto com estoque baixo</td></tr>';
        } else {
            tbody.innerHTML = dados.produtos.map(produto => `
                <tr>
                    <td><strong>${produto.nome}</strong></td>
                    <td>${produto.quantidade_estoque}</td>
                    <td>${produto.quantidade_minima}</td>
                    <td>${produto.categoria_nome || 'Sem categoria'}</td>
                </tr>
            `).join('');
        }
        
        detalhes.style.display = 'block';
        detalhes.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Erro ao carregar detalhes do estoque baixo:', error);
    }
}

function mostrarLoading(mostrar) {
    const loading = document.getElementById('loading');
    loading.style.display = mostrar ? 'flex' : 'none';
}

function mostrarToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas fa-${getToastIcon(tipo)}"></i>
            <span>${mensagem}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
  
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getToastIcon(tipo) {
    switch (tipo) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

