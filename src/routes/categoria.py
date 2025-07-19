from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.categoria import Categoria

categoria_bp = Blueprint('categoria', __name__)

@categoria_bp.route('/categorias', methods=['GET'])
def listar_categorias():
    """Lista todas as categorias"""
    try:
        categorias = Categoria.query.all()
        return jsonify([categoria.to_dict() for categoria in categorias]), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@categoria_bp.route('/categorias', methods=['POST'])
def criar_categoria():
    """Cria uma nova categoria"""
    try:
        dados = request.get_json()
        
        if not dados or 'nome' not in dados:
            return jsonify({'erro': 'Nome da categoria é obrigatório'}), 400
        
        # Verifica se já existe uma categoria com esse nome
        categoria_existente = Categoria.query.filter_by(nome=dados['nome']).first()
        if categoria_existente:
            return jsonify({'erro': 'Já existe uma categoria com esse nome'}), 400
        
        nova_categoria = Categoria(
            nome=dados['nome'],
            descricao=dados.get('descricao', '')
        )
        
        db.session.add(nova_categoria)
        db.session.commit()
        
        return jsonify(nova_categoria.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@categoria_bp.route('/categorias/<int:categoria_id>', methods=['GET'])
def obter_categoria(categoria_id):
    """Obtém uma categoria específica"""
    try:
        categoria = Categoria.query.get_or_404(categoria_id)
        return jsonify(categoria.to_dict()), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@categoria_bp.route('/categorias/<int:categoria_id>', methods=['PUT'])
def atualizar_categoria(categoria_id):
    """Atualiza uma categoria existente"""
    try:
        categoria = Categoria.query.get_or_404(categoria_id)
        dados = request.get_json()
        
        if not dados:
            return jsonify({'erro': 'Dados não fornecidos'}), 400
        
        # Verifica se o novo nome já existe em outra categoria
        if 'nome' in dados and dados['nome'] != categoria.nome:
            categoria_existente = Categoria.query.filter_by(nome=dados['nome']).first()
            if categoria_existente:
                return jsonify({'erro': 'Já existe uma categoria com esse nome'}), 400
        
        categoria.nome = dados.get('nome', categoria.nome)
        categoria.descricao = dados.get('descricao', categoria.descricao)
        
        db.session.commit()
        
        return jsonify(categoria.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

@categoria_bp.route('/categorias/<int:categoria_id>', methods=['DELETE'])
def deletar_categoria(categoria_id):
    """Deleta uma categoria"""
    try:
        categoria = Categoria.query.get_or_404(categoria_id)
        
        # Verifica se há produtos associados a esta categoria
        if categoria.produtos:
            return jsonify({'erro': 'Não é possível deletar categoria com produtos associados'}), 400
        
        db.session.delete(categoria)
        db.session.commit()
        
        return jsonify({'mensagem': 'Categoria deletada com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': str(e)}), 500

