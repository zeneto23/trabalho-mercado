from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.produto import Produto
from src.models.categoria import Categoria
from datetime import datetime

produto_bp = Blueprint('produto', __name__)

@produto_bp.route('/produtos', methods=['GET'])
def listar_produtos():
    """Lista todos os produtos com filtros opcionais"""
    try:
        # Parâmetros de filtro
        categoria_id = request.args.get('categoria_id', type=int)
        estoque_baixo = request.args.get('estoque_baixo', type=bool)
        busca = request.args.get('busca', '')
        
        query = Produto.query
        
        # Filtro por categoria
        if categoria_id:
            query = query.filter(Produto.categoria_id == categoria_id)
        
        # Filtro por estoque baixo
        if estoque_baixo:
            query = query.filter(Produto.quantidade_estoque <= Produto.quantidade_minima)
        
        # Busca por nome ou código de barras
        if busca:
            query = query.filter(
                (Produto.nome.contains(busca)) | 
                (Produto.codigo_barras.contains(busca))
            )
        
        produtos = query.all()
        return jsonify([produto.to_dict() for produto in produtos]), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/produtos', methods=['POST'])
def criar_produto():
    """Cria um novo produto"""
    try:
        dados = request.get_json()
        
        if not dados:
            return jsonify({'erro': 'Dados não fornecidos'}), 400
        
        # Validações obrigatórias
        campos_obrigatorios = ['nome', 'preco', 'categoria_id']
        for campo in campos_obrigatorios:
            if campo not in dados:
                return jsonify({'erro': f'Campo {campo} é obrigatório'}), 400
        
        # Verifica se a categoria existe
        categoria = Categoria.query.get(dados['categoria_id'])
        if not categoria:
            return jsonify({'erro': 'Categoria não encontrada'}), 400
        
        # Verifica se o código de barras já existe (se fornecido)
        if dados.get('codigo_barras'):
            produto_existente = Produto.query.filter_by(codigo_barras=dados['codigo_barras']).first()
            if produto_existente:
                return jsonify({'erro': 'Já existe um produto com esse código de barras'}), 400
        
        novo_produto = Produto(
            nome=dados['nome'],
            descricao=dados.get('descricao', ''),
            preco=float(dados['preco']),
            quantidade_estoque=int(dados.get('quantidade_estoque', 0)),
            quantidade_minima=int(dados.get('quantidade_minima', 5)),
            codigo_barras=dados.get('codigo_barras'),
            categoria_id=dados['categoria_id']
        )
        
        db.session.add(novo_produto)
        db.session.commit()
        
        return jsonify(novo_produto.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/produtos/<int:produto_id>', methods=['GET'])
def obter_produto(produto_id):
    """Obtém um produto específico"""
    try:
        produto = Produto.query.get_or_404(produto_id)
        return jsonify(produto.to_dict()), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/produtos/<int:produto_id>', methods=['PUT'])
def atualizar_produto(produto_id):
    """Atualiza um produto existente"""
    try:
        produto = Produto.query.get_or_404(produto_id)
        dados = request.get_json()
        
        if not dados:
            return jsonify({'erro': 'Dados não fornecidos'}), 400
        
        # Verifica se a categoria existe (se fornecida)
        if 'categoria_id' in dados:
            categoria = Categoria.query.get(dados['categoria_id'])
            if not categoria:
                return jsonify({'erro': 'Categoria não encontrada'}), 400
        
        # Verifica código de barras único (se alterado)
        if 'codigo_barras' in dados and dados['codigo_barras'] != produto.codigo_barras:
            if dados['codigo_barras']:
                produto_existente = Produto.query.filter_by(codigo_barras=dados['codigo_barras']).first()
                if produto_existente:
                    return jsonify({'erro': 'Já existe um produto com esse código de barras'}), 400
        
        # Atualiza os campos
        produto.nome = dados.get('nome', produto.nome)
        produto.descricao = dados.get('descricao', produto.descricao)
        produto.preco = float(dados.get('preco', produto.preco))
        produto.quantidade_estoque = int(dados.get('quantidade_estoque', produto.quantidade_estoque))
        produto.quantidade_minima = int(dados.get('quantidade_minima', produto.quantidade_minima))
        produto.codigo_barras = dados.get('codigo_barras', produto.codigo_barras)
        produto.categoria_id = dados.get('categoria_id', produto.categoria_id)
        produto.data_atualizacao = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify(produto.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/produtos/<int:produto_id>', methods=['DELETE'])
def deletar_produto(produto_id):
    """Deleta um produto"""
    try:
        produto = Produto.query.get_or_404(produto_id)
        
        db.session.delete(produto)
        db.session.commit()
        
        return jsonify({'mensagem': 'Produto deletado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/produtos/<int:produto_id>/estoque', methods=['PUT'])
def atualizar_estoque(produto_id):
    """Atualiza apenas o estoque de um produto"""
    try:
        produto = Produto.query.get_or_404(produto_id)
        dados = request.get_json()
        
        if not dados or 'quantidade' not in dados:
            return jsonify({'erro': 'Quantidade é obrigatória'}), 400
        
        operacao = dados.get('operacao', 'definir')  # definir, adicionar, remover
        quantidade = int(dados['quantidade'])
        
        if operacao == 'definir':
            produto.quantidade_estoque = quantidade
        elif operacao == 'adicionar':
            produto.quantidade_estoque += quantidade
        elif operacao == 'remover':
            if produto.quantidade_estoque < quantidade:
                return jsonify({'erro': 'Quantidade insuficiente em estoque'}), 400
            produto.quantidade_estoque -= quantidade
        else:
            return jsonify({'erro': 'Operação inválida. Use: definir, adicionar ou remover'}), 400
        
        produto.data_atualizacao = datetime.utcnow()
        db.session.commit()
        
        return jsonify(produto.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/relatorios/estoque-baixo', methods=['GET'])
def relatorio_estoque_baixo():
    """Relatório de produtos com estoque baixo"""
    try:
        produtos = Produto.query.filter(Produto.quantidade_estoque <= Produto.quantidade_minima).all()
        return jsonify({
            'total': len(produtos),
            'produtos': [produto.to_dict() for produto in produtos]
        }), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@produto_bp.route('/relatorios/valor-estoque', methods=['GET'])
def relatorio_valor_estoque():
    """Relatório do valor total do estoque"""
    try:
        produtos = Produto.query.all()
        valor_total = sum(produto.valor_total_estoque for produto in produtos)
        
        return jsonify({
            'valor_total_estoque': valor_total,
            'total_produtos': len(produtos),
            'produtos_por_categoria': {}
        }), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

